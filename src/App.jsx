import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from './api.js';
import AuthPage from './components/AuthPage.jsx';
import DeviceList from './components/DeviceList.jsx';
import AddDeviceModal from './components/AddDeviceModal.jsx';
import LiveMap from './components/LiveMap.jsx';
import Analytics from './components/Analytics.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(api.getToken()));
  const [devices, setDevices] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState('live');
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState('');
  const [now, setNow] = useState(Date.now());
  const toastTimer = useRef(null);

  const showToast = (text) => {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  };

  // go back to the login page when the login token is rejected
  useEffect(() => {
    api.setUnauthorizedHandler(() => {
      setUser(null);
      setDevices([]);
      setSelectedId(null);
    });
  }, []);

  // restore the session after a page reload
  useEffect(() => {
    if (!api.getToken()) return;
    api
      .me()
      .then(setUser)
      .catch(() => api.setToken(null))
      .finally(() => setChecking(false));
  }, []);

  const refreshDevices = useCallback(async () => {
    try {
      const list = await api.listDevices();
      setDevices(list);
      setSelectedId((current) => (list.some((d) => d.id === current) ? current : list.length > 0 ? list[0].id : null));
    } catch {
      /* the next poll will try again */
    }
  }, []);

  // keep the device list (online status, latest position) fresh
  useEffect(() => {
    if (!user) return undefined;
    refreshDevices();
    const timer = setInterval(refreshDevices, 5000);
    return () => clearInterval(timer);
  }, [user, refreshDevices]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  function logout() {
    api.setToken(null);
    setUser(null);
    setDevices([]);
    setSelectedId(null);
  }

  async function removeDevice(device) {
    if (!window.confirm(`Remove "${device.name}" and delete its position history?`)) return;
    try {
      await api.removeDevice(device.id);
      showToast(`Removed "${device.name}"`);
      refreshDevices();
    } catch (e) {
      showToast(e.message);
    }
  }

  if (checking) return <div className="center-screen muted">Loading…</div>;
  if (!user) return <AuthPage onAuth={setUser} />;

  const selected = devices.find((d) => d.id === selectedId) || null;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">📍</span>
          <div>
            <h1>Live Tracker</h1>
            <small className="muted">{user.name || user.email}</small>
          </div>
        </div>
        <button className="btn small ghost" onClick={logout}>
          Log out
        </button>
      </header>

      <div className="layout">
        <DeviceList
          devices={devices}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAdd={() => setShowAdd(true)}
          onRemove={removeDevice}
          now={now}
        />

        <main className="main">
          {selected ? (
            <>
              <div className="tabs">
                <button className={tab === 'live' ? 'active' : ''} onClick={() => setTab('live')}>
                  Live map
                </button>
                <button className={tab === 'analytics' ? 'active' : ''} onClick={() => setTab('analytics')}>
                  Analytics
                </button>
              </div>
              {tab === 'live' ? (
                <LiveMap key={selected.id} device={selected} />
              ) : (
                <Analytics key={selected.id} device={selected} />
              )}
            </>
          ) : (
            <div className="empty-main">
              <div className="empty-icon">📱</div>
              <h2>Add your first device</h2>
              <p className="muted">
                Install the Live Tracker app on your Android phone, click <b>Add device</b> and type the 6 digit code it shows.
              </p>
              <button className="btn primary" onClick={() => setShowAdd(true)}>
                ＋ Add device
              </button>
            </div>
          )}
        </main>
      </div>

      {showAdd && (
        <AddDeviceModal
          devices={devices}
          refresh={refreshDevices}
          onClose={() => setShowAdd(false)}
          onPaired={(id) => {
            setShowAdd(false);
            setSelectedId(id);
            setTab('live');
            showToast('Device connected');
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
