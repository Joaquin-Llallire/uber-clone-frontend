import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './App.css';

const api = axios.create({
  baseURL: 'http://localhost:8080',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

type Role = 'PASSENGER' | 'DRIVER';
type TripStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
type Page = 'passenger' | 'request' | 'trip' | 'driver' | 'history';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  available: boolean;
  rating: number;
}

interface Trip {
  id: number;
  status: TripStatus;
  pickupAddress: string;
  dropoffAddress: string;
  requestedAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  passenger: User;
  driver: User | null;
  passengerRating: number | null;
  ratingComment: string | null;
}

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as any;

    if (data?.error) return data.error;

    if (data && typeof data === 'object') {
      return Object.entries(data)
        .map(([key, value]) => `${key}: ${value}`)
        .join(' | ');
    }

    return error.message;
  }

  return 'Ocurrió un error inesperado';
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function StatusBadge({ status }: { status: TripStatus }) {
  return <span className={`badge ${status.toLowerCase()}`}>{status}</span>;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>('passenger');
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  async function loadMe() {
    const response = await api.get<User>('/users/me');
    setUser(response.data);
    setPage(response.data.role === 'DRIVER' ? 'driver' : 'passenger');
  }

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      setInitialLoading(false);
      return;
    }

    loadMe()
      .catch(() => {
        localStorage.removeItem('token');
        setUser(null);
      })
      .finally(() => setInitialLoading(false));
  }, []);

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
    setSelectedTripId(null);
  }

  function goHome() {
    setPage(user?.role === 'DRIVER' ? 'driver' : 'passenger');
  }

  if (initialLoading) {
    return <div className="center">Cargando sesión...</div>;
  }

  if (!user) {
    return <AuthPage onAuth={loadMe} />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Uber Clone E2E</h1>
          <p>
            {user.firstName} {user.lastName} · {user.role}
          </p>
        </div>

        <div className="topbar-actions">
          <button onClick={goHome}>Dashboard</button>
          <button onClick={() => setPage('history')}>Historial</button>
          <button className="danger" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      {page === 'passenger' && user.role === 'PASSENGER' && (
        <PassengerDashboard
          onRequestTrip={() => setPage('request')}
          onOpenTrip={(id) => {
            setSelectedTripId(id);
            setPage('trip');
          }}
        />
      )}

      {page === 'request' && user.role === 'PASSENGER' && (
        <RequestTrip
          onBack={() => setPage('passenger')}
          onCreated={(trip) => {
            setSelectedTripId(trip.id);
            setPage('trip');
          }}
        />
      )}

      {page === 'driver' && user.role === 'DRIVER' && (
        <DriverDashboard
          user={user}
          onOpenTrip={(id) => {
            setSelectedTripId(id);
            setPage('trip');
          }}
        />
      )}

      {page === 'trip' && selectedTripId && (
        <TripDetail tripId={selectedTripId} role={user.role} onBack={goHome} />
      )}

      {page === 'history' && <HistoryPage role={user.role} />}
    </div>
  );
}

function AuthPage({ onAuth }: { onAuth: () => Promise<void> }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({
    email: 'ana@uber.com',
    password: 'pass123',
  });

  const [registerForm, setRegisterForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'PASSENGER' as Role,
  });

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post<{ token: string }>('/auth/login', loginForm);
      localStorage.setItem('token', response.data.token);
      await onAuth();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post<{ token: string }>('/auth/register', registerForm);
      localStorage.setItem('token', response.data.token);
      await onAuth();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function useDemoUser(email: string) {
    setLoginForm({ email, password: 'pass123' });
    setMode('login');
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Uber Clone Frontend</h1>
        <p>Conectado al backend local en http://localhost:8080</p>

        <div className="tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Login
          </button>
          <button
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >
            Registro
          </button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="form">
            <label>Email</label>
            <input
              value={loginForm.email}
              onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
            />

            <label>Contraseña</label>
            <input
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            />

            <button disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="form">
            <label>Nombre</label>
            <input
              value={registerForm.firstName}
              onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
            />

            <label>Apellido</label>
            <input
              value={registerForm.lastName}
              onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
            />

            <label>Email</label>
            <input
              value={registerForm.email}
              onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
            />

            <label>Contraseña</label>
            <input
              type="password"
              value={registerForm.password}
              onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
            />

            <label>Rol</label>
            <select
              value={registerForm.role}
              onChange={(e) => setRegisterForm({ ...registerForm, role: e.target.value as Role })}
            >
              <option value="PASSENGER">PASSENGER</option>
              <option value="DRIVER">DRIVER</option>
            </select>

            <button disabled={loading}>{loading ? 'Registrando...' : 'Crear cuenta'}</button>
          </form>
        )}

        {error && <div className="error">{error}</div>}

        <div className="demo-users">
          <p>Usuarios rápidos:</p>
          <button onClick={() => useDemoUser('ana@uber.com')}>Ana pasajera</button>
          <button onClick={() => useDemoUser('carlos@uber.com')}>Carlos conductor</button>
          <button onClick={() => useDemoUser('pedro@uber.com')}>Pedro conductor</button>
        </div>
      </section>
    </main>
  );
}

function PassengerDashboard({
  onRequestTrip,
  onOpenTrip,
}: {
  onRequestTrip: () => void;
  onOpenTrip: (id: number) => void;
}) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [error, setError] = useState('');

  async function loadTrips() {
    try {
      const response = await api.get<Trip[]>('/trips');
      setTrips(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadTrips();
  }, []);

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h2>Dashboard pasajero</h2>
          <p>Solicita viajes y revisa sus estados.</p>
        </div>
        <button onClick={onRequestTrip}>Pedir nuevo viaje</button>
      </div>

      {error && <div className="error">{error}</div>}

      <section className="card">
        <div className="section-header">
          <h3>Mis viajes</h3>
          <button onClick={loadTrips}>Actualizar</button>
        </div>

        {trips.length === 0 ? (
          <p>No tienes viajes todavía.</p>
        ) : (
          <div className="grid">
            {trips.map((trip) => (
              <article className="trip-card" key={trip.id}>
                <div className="row-between">
                  <strong>Viaje #{trip.id}</strong>
                  <StatusBadge status={trip.status} />
                </div>
                <p>
                  <b>Origen:</b> {trip.pickupAddress}
                </p>
                <p>
                  <b>Destino:</b> {trip.dropoffAddress}
                </p>
                <p>
                  <b>Conductor:</b>{' '}
                  {trip.driver
                    ? `${trip.driver.firstName} ${trip.driver.lastName} ⭐ ${trip.driver.rating}`
                    : 'Buscando conductor...'}
                </p>
                <button onClick={() => onOpenTrip(trip.id)}>Ver detalle</button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function RequestTrip({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: (trip: Trip) => void;
}) {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [pickupAddress, setPickupAddress] = useState('Av. Javier Prado 100');
  const [dropoffAddress, setDropoffAddress] = useState('Miraflores, Lima');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadDrivers() {
    try {
      const response = await api.get<User[]>('/drivers/available');
      setDrivers(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadDrivers();
  }, []);

  async function createTrip(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post<Trip>('/trips', {
        pickupAddress,
        dropoffAddress,
      });

      onCreated(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h2>Solicitar viaje</h2>
          <p>Primero se muestran los conductores disponibles.</p>
        </div>
        <button className="secondary" onClick={onBack}>
          Volver
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <section className="card">
        <h3>Conductores disponibles</h3>
        {drivers.length === 0 ? (
          <p>No hay conductores disponibles ahora.</p>
        ) : (
          <div className="grid">
            {drivers.map((driver) => (
              <article className="mini-card" key={driver.id}>
                <strong>
                  {driver.firstName} {driver.lastName}
                </strong>
                <p>{driver.email}</p>
                <p>Rating: ⭐ {driver.rating}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h3>Datos del viaje</h3>

        <form className="form" onSubmit={createTrip}>
          <label>Origen</label>
          <input value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} />

          <label>Destino</label>
          <input value={dropoffAddress} onChange={(e) => setDropoffAddress(e.target.value)} />

          <button disabled={loading}>{loading ? 'Creando...' : 'Confirmar viaje'}</button>
        </form>
      </section>
    </main>
  );
}

function TripDetail({
  tripId,
  role,
  onBack,
}: {
  tripId: number;
  role: Role;
  onBack: () => void;
}) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadTrip() {
    try {
      const response = await api.get<Trip>(`/trips/${tripId}`);
      setTrip(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  useEffect(() => {
    if (!trip || (trip.status !== 'PENDING' && trip.status !== 'IN_PROGRESS')) return;

    const interval = window.setInterval(() => {
      loadTrip();
    }, 4000);

    return () => window.clearInterval(interval);
  }, [trip?.status, tripId]);

  async function rateTrip(event: React.FormEvent) {
    event.preventDefault();
    if (!trip) return;

    setError('');
    setMessage('');

    try {
      const response = await api.post<Trip>(`/trips/${trip.id}/rate`, {
        rating,
        comment,
      });

      setTrip(response.data);
      setMessage('Calificación guardada correctamente.');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function completeTrip() {
    if (!trip) return;

    setError('');
    setMessage('');

    try {
      const response = await api.patch<Trip>(`/trips/${trip.id}/complete`);
      setTrip(response.data);
      setMessage('Viaje completado correctamente.');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (!trip) {
    return (
      <main className="page">
        <button onClick={onBack}>Volver</button>
        <p>Cargando viaje...</p>
        {error && <div className="error">{error}</div>}
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h2>Detalle del viaje #{trip.id}</h2>
          <p>
            Estado actual: <StatusBadge status={trip.status} />
          </p>
        </div>
        <button className="secondary" onClick={onBack}>
          Volver
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      <section className="card">
        <h3>Ruta</h3>
        <p>
          <b>Origen:</b> {trip.pickupAddress}
        </p>
        <p>
          <b>Destino:</b> {trip.dropoffAddress}
        </p>
        <p>
          <b>Solicitado:</b> {formatDate(trip.requestedAt)}
        </p>
        <p>
          <b>Aceptado:</b> {formatDate(trip.acceptedAt)}
        </p>
        <p>
          <b>Completado:</b> {formatDate(trip.completedAt)}
        </p>
      </section>

      {role === 'PASSENGER' && (
        <section className="card">
          <h3>Conductor</h3>
          {trip.driver ? (
            <>
              <p>
                {trip.driver.firstName} {trip.driver.lastName}
              </p>
              <p>Rating: ⭐ {trip.driver.rating}</p>
            </>
          ) : (
            <p>Buscando conductor...</p>
          )}

          {trip.status === 'COMPLETED' && trip.passengerRating === null && (
            <form className="form rating-form" onSubmit={rateTrip}>
              <h3>Calificar viaje</h3>

              <label>Estrellas</label>
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                <option value={1}>1 estrella</option>
                <option value={2}>2 estrellas</option>
                <option value={3}>3 estrellas</option>
                <option value={4}>4 estrellas</option>
                <option value={5}>5 estrellas</option>
              </select>

              <label>Comentario opcional</label>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} />

              <button>Enviar calificación</button>
            </form>
          )}

          {trip.passengerRating !== null && (
            <div className="success">
              Ya calificaste este viaje con {trip.passengerRating} estrella(s).
            </div>
          )}
        </section>
      )}

      {role === 'DRIVER' && (
        <section className="card">
          <h3>Pasajero</h3>
          <p>
            {trip.passenger.firstName} {trip.passenger.lastName}
          </p>
          <p>{trip.passenger.email}</p>

          {trip.status === 'IN_PROGRESS' && (
            <button onClick={completeTrip}>Completar viaje</button>
          )}

          {trip.status === 'COMPLETED' && <div className="success">Viaje completado.</div>}
        </section>
      )}
    </main>
  );
}

function DriverDashboard({
  user,
  onOpenTrip,
}: {
  user: User;
  onOpenTrip: (id: number) => void;
}) {
  const [pendingTrips, setPendingTrips] = useState<Trip[]>([]);
  const [myTrips, setMyTrips] = useState<Trip[]>([]);
  const [error, setError] = useState('');

  const activeTrip = myTrips.find((trip) => trip.status === 'IN_PROGRESS');
  const completedTrips = myTrips.filter((trip) => trip.status === 'COMPLETED');

  async function loadData() {
    try {
      const [pendingResponse, myTripsResponse] = await Promise.all([
        api.get<Trip[]>('/trips/pending'),
        api.get<Trip[]>('/trips/my'),
      ]);

      setPendingTrips(pendingResponse.data);
      setMyTrips(myTripsResponse.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function acceptTrip(id: number) {
    setError('');

    try {
      const response = await api.patch<Trip>(`/trips/${id}/accept`);
      onOpenTrip(response.data.id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h2>Dashboard conductor</h2>
          <p>
            Rating propio: ⭐ {user.rating} ·{' '}
            {user.available ? 'Disponible' : 'No disponible'}
          </p>
        </div>
        <button onClick={loadData}>Actualizar</button>
      </div>

      {error && <div className="error">{error}</div>}

      {activeTrip && (
        <section className="card highlight">
          <h3>Viaje activo</h3>
          <p>
            <b>Origen:</b> {activeTrip.pickupAddress}
          </p>
          <p>
            <b>Destino:</b> {activeTrip.dropoffAddress}
          </p>
          <button onClick={() => onOpenTrip(activeTrip.id)}>Completar</button>
        </section>
      )}

      <section className="card">
        <h3>Viajes disponibles</h3>

        {pendingTrips.length === 0 ? (
          <p>No hay viajes pendientes.</p>
        ) : (
          <div className="grid">
            {pendingTrips.map((trip) => (
              <article className="trip-card" key={trip.id}>
                <div className="row-between">
                  <strong>Viaje #{trip.id}</strong>
                  <StatusBadge status={trip.status} />
                </div>
                <p>
                  <b>Origen:</b> {trip.pickupAddress}
                </p>
                <p>
                  <b>Destino:</b> {trip.dropoffAddress}
                </p>
                <p>
                  <b>Pasajero:</b> {trip.passenger.firstName} {trip.passenger.lastName}
                </p>
                <button onClick={() => acceptTrip(trip.id)}>Aceptar</button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h3>Historial completado</h3>

        {completedTrips.length === 0 ? (
          <p>No tienes viajes completados.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Origen</th>
                  <th>Destino</th>
                  <th>Rating</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {completedTrips.map((trip) => (
                  <tr key={trip.id}>
                    <td>{trip.id}</td>
                    <td>{trip.pickupAddress}</td>
                    <td>{trip.dropoffAddress}</td>
                    <td>{trip.passengerRating ?? '—'}</td>
                    <td>
                      <button onClick={() => onOpenTrip(trip.id)}>Ver</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function HistoryPage({ role }: { role: Role }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filter, setFilter] = useState<'ALL' | TripStatus>('ALL');
  const [error, setError] = useState('');

  const filteredTrips = useMemo(() => {
    if (filter === 'ALL') return trips;
    return trips.filter((trip) => trip.status === filter);
  }, [filter, trips]);

  async function loadHistory() {
    try {
      const endpoint = role === 'PASSENGER' ? '/trips' : '/trips/my';
      const response = await api.get<Trip[]>(endpoint);
      setTrips(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadHistory();
  }, [role]);

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h2>Historial</h2>
          <p>Tabla de viajes pasados con filtro por estado.</p>
        </div>

        <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
          <option value="ALL">Todos</option>
          <option value="PENDING">PENDING</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="COMPLETED">COMPLETED</option>
        </select>
      </div>

      {error && <div className="error">{error}</div>}

      <section className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Estado</th>
                <th>Origen</th>
                <th>Destino</th>
                <th>Conductor</th>
                <th>Rating</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrips.map((trip) => (
                <tr key={trip.id}>
                  <td>{trip.id}</td>
                  <td>
                    <StatusBadge status={trip.status} />
                  </td>
                  <td>{trip.pickupAddress}</td>
                  <td>{trip.dropoffAddress}</td>
                  <td>
                    {trip.driver
                      ? `${trip.driver.firstName} ${trip.driver.lastName}`
                      : '—'}
                  </td>
                  <td>{trip.passengerRating ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default App;