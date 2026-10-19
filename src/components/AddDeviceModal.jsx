import { useCallback, useEffect, useRef, useState } from 'react';
import { createPairingCode } from '../api.js';

export default function AddDeviceModal({ devices, refresh, onClose, onPaired }) {
  const [code, setCode] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [paired, setPaired] = useState(null);

  // Devices that existed when the window opened: a new one means the phone has paired
  const knownIds = useRef(new Set(devices.map((d) => d.id)));

  // The parent re-renders every second, so keep the latest callback in a ref instead of an effect dependency
  const onPairedRef = useRef(onPaired);
  onPairedRef.current = onPaired;

  const newCode = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const result = await createPairingCode();
      setCode(result.code);
      setExpiresAt(new Date(result.expiresAt).getTime());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    newCode();
  }, [newCode]);

  // countdown
  useEffect(() => {
    if (!expiresAt) return undefined;
    const tick = () => setSecondsLeft(Math.max(0, Math.round((expiresAt - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  // check for the new device every 2 seconds
  useEffect(() => {
    if (paired) return undefined;
    const timer = setInterval(refresh, 2000);
    return () => clearInterval(timer);
  }, [refresh, paired]);

  useEffect(() => {
    if (paired) return;
    const fresh = devices.find((d) => !knownIds.current.has(d.id));
    if (fresh) setPaired(fresh);
  }, [devices, paired]);

  useEffect(() => {
    if (!paired) return undefined;
    const timer = setTimeout(() => onPairedRef.current(paired.id), 1800);
    return () => clearTimeout(timer);
  }, [paired]);

  const expired = code && secondsLeft === 0;
  const grouped = code ? `${code.slice(0, 3)} ${code.slice(3)}` : '';
  const mm = String(Math.floor(secondsLeft / 60)).padStart(1, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>Add a device</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        {paired ? (
          <div className="paired">
            <div className="paired-icon">✅</div>
            <h3>"{paired.name}" is connected</h3>
            <p className="muted">It is now linked to your account.</p>
          </div>
        ) : (
          <>
            <ol className="steps">
              <li>Open the <b>Live Tracker</b> app on your Android phone.</li>
              <li>Type this code on the "Add this phone" screen.</li>
              <li>Keep this window open. It closes by itself when the phone connects.</li>
            </ol>

            {error && <div className="form-error">{error}</div>}

            {code && (
              <div className={`code-box ${expired ? 'expired' : ''}`}>
                <div className="code">{grouped}</div>
                <div className="muted small">
                  {expired ? 'This code has expired' : `Valid for ${mm}:${ss}`}
                </div>
              </div>
            )}

            <footer className="modal-foot">
              <button className="btn" onClick={newCode} disabled={busy}>
                {busy ? 'Creating…' : 'New code'}
              </button>
              <button className="btn ghost" onClick={onClose}>
                Close
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
