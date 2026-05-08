// Version 1.0.1 - Auth Integration
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Plus, Server, MapPin, Users, Search, ArrowLeft, Trash2, Edit2, CheckCircle, XCircle, ExternalLink, AlertTriangle, ChevronDown, Navigation, Locate, Filter, Map, Loader2, Settings, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Unit, City, CTO, Client } from './types.js';
import { AuthProvider, useAuth } from './contexts/AuthContext.js';
import { auth } from './firebase.js';
import Login from './pages/Login.js';
import UserManagement from './pages/Users.js';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper to handle authorized fetches
async function authFetch(url: string, options: RequestInit = {}) {
  const currentUser = auth.currentUser;
  if (currentUser) {
    const idToken = await currentUser.getIdToken();
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${idToken}`,
    };
  }
  return fetch(url, options);
}

function ProtectedRoute({ children, roles }: { children: React.ReactNode, roles?: string[] }) {
  const { user, loading } = useAuth();

  console.log('[App] Version 1.0.5 Loaded');
  console.log('[ProtectedRoute] user:', user, 'loading:', loading);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  if (!user) {
    console.log('[ProtectedRoute] No user found, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <div className="h-screen flex items-center justify-center text-red-600">Acesso negado.</div>;
  }

  return <>{children}</>;
}

// --- Components ---

function Tabs({ tabs, activeTab, onChange }: { tabs: { id: string; label: string }[]; activeTab: string; onChange: (id: string) => void }) {
  return (
    <div className="border-b border-slate-200 mb-6">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Button({ className, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
    ghost: 'text-slate-600 hover:bg-slate-100',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden', className)} {...props}>{children}</div>;
}

function Badge({ status }: { status: 'active' | 'inactive' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        status === 'active'
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-slate-100 text-slate-800'
      )}
    >
      {status === 'active' ? 'Ativo' : 'Inativo'}
    </span>
  );
}

function AddressDisplay({ address, className }: { address?: string; className?: string }) {
  if (!address) return <span className={className}>Sem endereço</span>;

  const isLink = address.startsWith('http') ||
    address.startsWith('www.') ||
    address.includes('maps.google') ||
    address.includes('google.com/maps') ||
    address.includes('goo.gl');

  // Check if it's a coordinate pattern: e.g., "-6.87037840, -36.91088628"
  const isCoords = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(address.trim());

  if (isLink || isCoords) {
    let href = address;
    if (isCoords) {
      href = `https://www.google.com/maps/search/?api=1&query=${address.trim()}`;
    } else if (!address.startsWith('http')) {
      href = `https://${address}`;
    }

    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1", className)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          window.open(href, '_blank', 'noopener,noreferrer');
        }}
      >
        Ver no Mapa <ExternalLink className="w-3 h-3" />
      </a>
    );
  }

  return <span className={cn("truncate", className)}>{address}</span>;
}

// --- Pages ---

function Dashboard() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [newCityName, setNewCityName] = useState('');
  const [newCityUnitId, setNewCityUnitId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('cities');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'new') {
      setActiveTab('new');
    } else {
      setActiveTab('cities');
    }
  }, [location.search]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Unit Management
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);

  // City Editing
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [editCityForm, setEditCityForm] = useState({ name: '', unit_id: '' });
  const [expandedUnits, setExpandedUnits] = useState<Record<number, boolean>>({});
  const [unassignedExpanded, setUnassignedExpanded] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchUnits(), fetchCities()]);
    setLoading(false);
  };

  const fetchUnits = async () => {
    try {
      const res = await authFetch('/api/units');
      const data = await res.json();
      if (Array.isArray(data)) setUnits(data);
    } catch (error) {
      console.error('Failed to fetch units', error);
    }
  };

  const fetchCities = async () => {
    try {
      const res = await authFetch('/api/cities');
      const data = await res.json();
      if (Array.isArray(data)) {
        setCities(data);
      } else {
        console.error('API did not return an array for cities:', data);
        setCities([]);
      }
    } catch (error) {
      console.error('Failed to fetch cities', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCityName.trim()) return alert('Por favor, informe o nome da cidade.');

    try {
      setLoading(true);
      const res = await authFetch('/api/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCityName.trim().toUpperCase(),
          unit_id: newCityUnitId ? Number(newCityUnitId) : null
        }),
      });

      if (res.ok) {
        setNewCityName('');
        setNewCityUnitId('');
        await fetchData(); // Atualiza unidades e cidades
        navigate('/?tab=cities');
        alert('Cidade cadastrada com sucesso!');
      } else {
        const err = await res.json();
        alert('Erro ao salvar cidade: ' + (err.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Failed to add city', error);
      alert('Erro de conexão ao tentar salvar a cidade.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim()) return;

    try {
      const res = await authFetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newUnitName }),
      });
      if (res.ok) {
        setNewUnitName('');
        setShowUnitModal(false);
        fetchUnits();
      }
    } catch (error) {
      console.error('Failed to add unit', error);
    }
  };

  const handleDeleteUnit = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta unidade? As cidades ficarão sem unidade.')) return;
    try {
      await authFetch(`/api/units/${id}`, { method: 'DELETE' });
      fetchUnits();
      fetchCities();
    } catch (error) {
      console.error('Failed to delete unit', error);
    }
  };

  const handleOpenEditCity = (e: React.MouseEvent, city: City) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingCity(city);
    setEditCityForm({ name: city.name, unit_id: city.unit_id?.toString() || '' });
  };

  const handleSaveCityEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCity) return;
    try {
      const res = await authFetch(`/api/cities/${editingCity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editCityForm.name,
          unit_id: editCityForm.unit_id ? Number(editCityForm.unit_id) : null
        }),
      });
      if (res.ok) {
        setEditingCity(null);
        fetchCities();
      }
    } catch (error) {
      console.error('Failed to update city', error);
    }
  };

  const toggleUnit = (unitId: number) => {
    setExpandedUnits(prev => ({
      ...prev,
      [unitId]: !prev[unitId]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CTO's</h1>
          <p className="text-slate-500">Acessar CTO da cidade da sua rede.</p>
        </div>
      </div>

      {activeTab === 'new' ? (
        <Card className="p-6 max-w-xl">
          <h3 className="text-lg font-medium text-slate-900 mb-4">Nova Cidade</h3>
          <form onSubmit={handleAddCity} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Cidade</label>
              <input
                type="text"
                placeholder="Ex: São Paulo"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unidade (Opcional)</label>
              <select
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                value={newCityUnitId}
                onChange={(e) => setNewCityUnitId(e.target.value)}
              >
                <option value="">Sem Unidade</option>
                {units.map(unit => (
                  <option key={unit.id} value={unit.id}>{unit.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end">
              <Button type="submit">
                <Plus className="w-4 h-4 mr-2" />
                Salvar Cidade
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <>
          {loading ? (
            <div className="text-center py-12 text-slate-500">Carregando...</div>
          ) : cities.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <MapPin className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-900">Nenhuma cidade cadastrada</h3>
              <p className="text-slate-500">Adicione uma cidade para começar.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {selectedUnitId === null ? (
                /* Units Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {units.map(unit => {
                    const unitCitiesCount = cities.filter(c => c.unit_id === unit.id).length;
                    return (
                      <Card
                        key={unit.id}
                        className="hover:border-indigo-500 transition-colors cursor-pointer group"
                        onClick={() => setSelectedUnitId(unit.id)}
                      >
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 transition-transform group-hover:scale-110">
                              <Server className="w-6 h-6" />
                            </div>
                            {user?.role === 'admin' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteUnit(unit.id);
                                }}
                                className="p-1.5 text-slate-300 hover:text-red-600 transition-colors"
                                title="Excluir Unidade"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 mb-1">{unit.name}</h3>
                          <p className="text-sm text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {unitCitiesCount} {unitCitiesCount === 1 ? 'Cidade' : 'Cidades'}
                          </p>
                        </div>
                      </Card>
                    );
                  })}

                  {/* Unassigned Cities "Pseudo-Unit" Card */}
                  {cities.filter(c => !c.unit_id).length > 0 && (
                    <Card
                      className="hover:border-slate-400 transition-colors cursor-pointer group border-dashed bg-slate-50/50"
                      onClick={() => setSelectedUnitId(-1)} // -1 for unassigned
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                            <MapPin className="w-6 h-6" />
                          </div>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-1">Sem Unidade</h3>
                        <p className="text-sm text-slate-500">
                          {cities.filter(c => !c.unit_id).length} Cidades pendentes
                        </p>
                      </div>
                    </Card>
                  )}
                </div>
              ) : (
                /* Selected Unit Detail View */
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => setSelectedUnitId(null)} className="!p-2">
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">
                        {selectedUnitId === -1 ? 'Sem Unidade' : units.find(u => u.id === selectedUnitId)?.name}
                      </h2>
                      <p className="text-slate-500">Cidades pertencentes a esta unidade.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
                    {cities
                      .filter(c => selectedUnitId === -1 ? !c.unit_id : c.unit_id === selectedUnitId)
                      .map((city) => (
                        <Link key={city.id} to={`/city/${city.id}`}>
                          <Card className="hover:border-indigo-500 transition-colors cursor-pointer h-full border-l-4 border-l-indigo-500">
                            <div className="p-6">
                              <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                                  <MapPin className="w-6 h-6" />
                                </div>
                                <div className="flex items-center gap-1">
                                  {user?.role === 'admin' && (
                                    <button
                                      onClick={(e) => handleOpenEditCity(e, city)}
                                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                      title="Editar Cidade"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  )}
                                  <ArrowLeft className="w-5 h-5 text-slate-300 rotate-180" />
                                </div>
                              </div>
                              <h3 className="text-lg font-bold text-slate-900">{city.name}</h3>
                              <p className="text-sm text-slate-500 mt-1 italic">Clique para ver infraestrutura</p>
                            </div>
                          </Card>
                        </Link>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Unit Management Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold">Gerenciar Unidades</h2>
                <p className="text-slate-500 text-sm">Crie e gerencie os conjuntos de cidades.</p>
              </div>
              <button onClick={() => setShowUnitModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddUnit} className="flex gap-2 mb-6">
              <input
                required
                type="text"
                placeholder="Nome da nova unidade"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
              />
              <Button type="submit">Adicionar</Button>
            </form>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {units.length === 0 ? (
                <div className="text-center py-4 text-slate-500 italic">Nenhuma unidade cadastrada.</div>
              ) : (
                units.map(unit => (
                  <div key={unit.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-medium text-slate-900">{unit.name}</span>
                    <button
                      onClick={() => handleDeleteUnit(unit.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <Button onClick={() => setShowUnitModal(false)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">Importar Dados (Geogrid)</h2>
                <p className="text-slate-500 text-sm">Cole as linhas da sua planilha Geogrid abaixo.</p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Instruções: Selecione as linhas no Excel, copie (Ctrl+C) e cole aqui (Ctrl+V).
              </label>
              <textarea
                className="w-full h-64 p-3 border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Id	Sigla	Sigla (poste)	Tag map	...	Cidade	..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
            </div>

            <div className="flex justify-between items-center">
              <p className="text-xs text-slate-400 max-w-xs">
                Limite aumentado: Suporta até 10.000 linhas por vez.
                O sistema identificará Cidade, Sigla (CTO), Latitude e Longitude automaticamente.
              </p>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => setShowImportModal(false)}>Cancelar</Button>
                <Button
                  onClick={async () => {
                    if (!importText.trim()) return;
                    setIsImporting(true);
                    try {
                      // Parse TSV
                      const lines = importText.split('\n');
                      const rows = lines.map(line => {
                        const cols = line.split('\t');
                        if (cols.length < 17) return null;
                        return {
                          sigla: cols[1],
                          sigla_poste: cols[2],
                          lat: cols[5],
                          lng: cols[6],
                          endereco: cols[13],
                          cidade: cols[16]
                        };
                      }).filter(r => r && r.cidade && r.cidade !== 'Cidade'); // Filter header and invalid rows

                      if (rows.length === 0) {
                        alert('Nenhum dado válido encontrado. Certifique-se de copiar as colunas corretas.');
                        setIsImporting(false);
                        return;
                      }

                      const res = await authFetch('/api/import', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ rows })
                      });
                      const result = await res.json();
                      if (res.ok) {
                        alert(`${result.count} CTOs importadas com sucesso!`);
                        setImportText('');
                        setShowImportModal(false);
                        fetchCities();
                      } else {
                        alert('Erro na importação: ' + result.error);
                      }
                    } catch (err) {
                      console.error('Import failed', err);
                      alert('Falha interna ao processar dados.');
                    } finally {
                      setIsImporting(false);
                    }
                  }}
                  disabled={isImporting || !importText.trim()}
                >
                  {isImporting ? 'Importando...' : 'Iniciar Importação'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* City Edit Modal */}
      {editingCity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold">Editar Cidade</h2>
              <button onClick={() => setEditingCity(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSaveCityEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Cidade</label>
                <input
                  required
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={editCityForm.name}
                  onChange={(e) => setEditCityForm({ ...editCityForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unidade</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={editCityForm.unit_id}
                  onChange={(e) => setEditCityForm({ ...editCityForm, unit_id: e.target.value })}
                >
                  <option value="">Sem Unidade</option>
                  {units.map(unit => (
                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button type="button" variant="secondary" onClick={() => setEditingCity(null)}>Cancelar</Button>
                <Button type="submit">Salvar Alterações</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

function CityView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ctos, setCtos] = useState<CTO[]>([]);
  const [cityName, setCityName] = useState('');
  const [unitName, setUnitName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ctos');
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 100, pages: 1 });

  // Form state - novo CTO
  const [newCTOName, setNewCTOName] = useState('');
  const [newCTOAddress, setNewCTOAddress] = useState('');
  const [newCTOPorts, setNewCTOPorts] = useState(16);

  // City Editing
  const [units, setUnits] = useState<Unit[]>([]);
  const [isEditingCity, setIsEditingCity] = useState(false);
  const [editCityForm, setEditCityForm] = useState({ name: '', unit_id: '' });

  // Edição de CTO
  const [editingCTO, setEditingCTO] = useState<CTO | null>(null);
  const [editForm, setEditForm] = useState({ name: '', address: '', total_ports: 16 });

  useEffect(() => {
    fetchCTOs();
    const fetchCityData = async () => {
      try {
        const [citiesReq, unitsReq] = await Promise.all([
          fetch('/api/cities'),
          fetch('/api/units')
        ]);
        const citiesData = await citiesReq.json();
        const unitsData = await unitsReq.json();

        if (Array.isArray(unitsData)) setUnits(unitsData);

        if (Array.isArray(citiesData)) {
          const city = citiesData.find((c: City) => c.id === Number(id));
          if (city) {
            setCityName(city.name);
            setEditCityForm({ name: city.name, unit_id: city.unit_id?.toString() || '' });
            if (city.unit_id && Array.isArray(unitsData)) {
              const unit = unitsData.find((u: Unit) => u.id === city.unit_id);
              if (unit) setUnitName(unit.name);
              else setUnitName(null);
            } else {
              setUnitName(null);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch city data', err);
      }
    };
    fetchCityData();
  }, [id]);

  const fetchCTOs = async (page = 1) => {
    try {
      setLoading(true);
      const res = await authFetch(`/api/cities/${id}/ctos?page=${page}&limit=100`);
      const data = await res.json();
      if (data.ctos && Array.isArray(data.ctos)) {
        setCtos(data.ctos);
        setPagination(data.pagination);
      } else {
        console.error('API did not return correctly formatted CTO data:', data);
        setCtos([]);
      }
    } catch (error) {
      console.error('Failed to fetch CTOs', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocalização não é suportada pelo seu navegador.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setNewCTOAddress(mapsLink);
      },
      (error) => {
        console.error("Error getting location:", error);
        let msg = "Erro ao obter localização.";
        if (error.code === 1) msg = "Permissão de localização negada. Verifique as configurações do seu navegador.";
        else if (error.code === 2) msg = "Localização indisponível. Verifique se o GPS está ativado.";
        else if (error.code === 3) msg = "Tempo esgotado ao obter localização.";
        alert(msg);
      }
    );
  };

  const handleSaveCityEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch(`/api/cities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editCityForm.name,
          unit_id: editCityForm.unit_id ? Number(editCityForm.unit_id) : null
        }),
      });
      if (res.ok) {
        setIsEditingCity(false);
        // Refresh local data
        setCityName(editCityForm.name);
        const unit = units.find(u => u.id === Number(editCityForm.unit_id));
        setUnitName(unit ? unit.name : null);
      }
    } catch (error) {
      console.error('Failed to update city', error);
    }
  };

  const handleAddCTO = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/ctos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCTOName,
          address: newCTOAddress,
          total_ports: newCTOPorts,
          city_id: Number(id),
        }),
      });
      if (res.ok) {
        setNewCTOName('');
        setNewCTOAddress('');
        setNewCTOPorts(16);
        fetchCTOs();
        setActiveTab('ctos');
      }
    } catch (error) {
      console.error('Failed to add CTO', error);
    }
  };

  const handleOpenEdit = (e: React.MouseEvent, cto: CTO) => {
    e.stopPropagation();
    setEditingCTO(cto);
    setEditForm({ name: cto.name, address: cto.address || '', total_ports: cto.total_ports });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCTO) return;
    try {
      await authFetch(`/api/ctos/${editingCTO.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      setEditingCTO(null);
      fetchCTOs();
    } catch (err) {
      console.error('Failed to update CTO', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/')} className="!p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{cityName || 'Cidade'}</h1>
            {unitName && (
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-full border border-indigo-100">
                {unitName}
              </span>
            )}
            {user?.role === 'admin' && (
              <button
                onClick={() => setIsEditingCity(true)}
                className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                title="Editar Cidade"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-slate-500">Gerencie as CTOs desta cidade.</p>
        </div>
      </div>

      {/* City Edit Modal */}
      {isEditingCity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold">Editar Cidade</h2>
              <button onClick={() => setIsEditingCity(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSaveCityEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Cidade</label>
                <input
                  required
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={editCityForm.name}
                  onChange={(e) => setEditCityForm({ ...editCityForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unidade</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={editCityForm.unit_id}
                  onChange={(e) => setEditCityForm({ ...editCityForm, unit_id: e.target.value })}
                >
                  <option value="">Sem Unidade</option>
                  {units.map(unit => (
                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button type="button" variant="secondary" onClick={() => setIsEditingCity(false)}>Cancelar</Button>
                <Button type="submit">Salvar Alterações</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-500">Carregando...</div>
      ) : ctos.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <Server className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-900">Nenhuma CTO cadastrada</h3>
          <p className="text-slate-500">Cadastre uma nova CTO através da aba de Preferências.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ctos.map((cto) => (
              <div key={cto.id} onClick={() => navigate(`/cto/${cto.id}`)} className="h-full">
                <Card className="hover:border-indigo-500 transition-colors cursor-pointer h-full group">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                          <Server className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{cto.name}</h3>
                          <p className="text-xs text-slate-500">{cto.total_ports} Portas</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(cto.used_ports || 0) >= cto.total_ports && (
                          <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full border border-red-200">
                            LOTADA
                          </span>
                        )}
                        {user?.role === 'admin' && (
                          <button
                            onClick={(e) => handleOpenEdit(e, cto)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Editar CTO"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-slate-600">
                        <MapPin className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0" />
                        <AddressDisplay address={cto.address} />
                      </div>
                      <div className="flex items-center text-sm text-slate-600">
                        <Users className="w-4 h-4 mr-2 text-slate-400" />
                        <span>{cto.used_ports || 0} Clientes ativos</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                      <div className="text-xs font-medium text-slate-500">
                        Ocupação: {Math.round(((cto.used_ports || 0) / cto.total_ports) * 100)}%
                      </div>
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${Math.round(((cto.used_ports || 0) / cto.total_ports) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
          {/* Pagination Controls */}
          {pagination.pages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-6">
              <p className="text-sm text-slate-500">
                Mostrando <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> até <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> de <span className="font-medium">{pagination.total}</span> CTOs
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => fetchCTOs(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  Anterior
                </Button>
                <div className="flex items-center px-4 bg-slate-50 rounded-lg border border-slate-200 text-sm font-medium text-slate-700">
                  Página {pagination.page} de {pagination.pages}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => fetchCTOs(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de Edição de CTO */}
      {editingCTO && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">Editar CTO</h2>
                <p className="text-slate-500 text-sm">Altere as informações da CTO</p>
              </div>
              <button onClick={() => setEditingCTO(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da CTO</label>
                <input
                  required
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Endereço / Localização</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Ex: Rua das Flores, Poste 12"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.geolocation?.getCurrentPosition(
                        (pos) => setEditForm(prev => ({ ...prev, address: `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}` })),
                        () => alert('Não foi possível obter a localização.')
                      );
                    }}
                    className="px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600"
                    title="Usar minha localização"
                  >
                    <MapPin className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Número de Portas</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={editForm.total_ports}
                  onChange={(e) => setEditForm({ ...editForm, total_ports: Number(e.target.value) })}
                >
                  <option value={8}>8 Portas</option>
                  <option value={16}>16 Portas</option>
                  <option value={24}>24 Portas</option>
                </select>
              </div>
              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100 justify-end">
                <Button type="button" variant="secondary" onClick={() => setEditingCTO(null)}>Cancelar</Button>
                <Button type="submit">Salvar AlteraÃ§Ãµes</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CTODetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cto, setCto] = useState<CTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('map');

  // Client Modal State
  const [selectedPort, setSelectedPort] = useState<number | null>(null);
  const [clientForm, setClientForm] = useState({ name: '', address: '', pppoe: '', status: 'active' as const });
  const [existingClient, setExistingClient] = useState<Client | null>(null);

  useEffect(() => {
    fetchCTODetails();
  }, [id]);

  const fetchCTODetails = async () => {
    try {
      const res = await authFetch(`/api/ctos/${id}`);
      if (!res.ok) throw new Error('CTO not found');
      const data = await res.json();
      setCto(data);
    } catch (error) {
      console.error(error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handlePortClick = (portNum: number) => {
    const client = cto?.clients?.find(c => c.port_number === portNum);
    setSelectedPort(portNum);
    if (client) {
      setExistingClient(client);
      setClientForm({ name: client.name, address: client.address, pppoe: client.pppoe || '', status: client.status });
    } else {
      setExistingClient(null);
      setClientForm({ name: '', address: '', pppoe: '', status: 'active' });
    }
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cto || selectedPort === null) return;

    try {
      if (existingClient) {
        // Update
        await authFetch(`/api/clients/${existingClient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientForm),
        });
      } else {
        // Create
        await authFetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...clientForm,
            city_id: cto.city_id,
            cto_id: cto.id,
            port_number: selectedPort,
          }),
        });
      }
      setSelectedPort(null);
      fetchCTODetails();
    } catch (error) {
      console.error('Failed to save client', error);
    }
  };

  const handleDeleteClient = async () => {
    if (!existingClient) return;
    if (!confirm('Tem certeza que deseja remover este cliente?')) return;

    try {
      await authFetch(`/api/clients/${existingClient.id}`, { method: 'DELETE' });
      setSelectedPort(null);
      fetchCTODetails();
    } catch (error) {
      console.error('Failed to delete client', error);
    }
  };

  if (loading || !cto) return <div className="text-center py-12">Carregando...</div>;

  const occupiedPorts = cto.clients?.length || 0;
  const isFull = occupiedPorts >= cto.total_ports;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(`/city/${cto.city_id}`)} className="!p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{cto.name}</h1>
            {isFull && (
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full border border-red-200 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                LOTADA
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <AddressDisplay address={cto.address} />
          </div>
        </div>
      </div>

      {isFull && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                <span className="font-bold">Atenção:</span> Esta CTO atingiu sua capacidade máxima ({cto.total_ports} portas ocupadas). Não é possível adicionar novos clientes.
              </p>
            </div>
          </div>
        </div>
      )}

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'map', label: 'Mapa de Portas' },
          { id: 'list', label: 'Lista de Clientes' },
        ]}
      />

      {activeTab === 'map' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Ports Grid */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6">Painel de Portas</h3>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
                {Array.from({ length: cto.total_ports }).map((_, i) => {
                  const portNum = i + 1;
                  const client = cto.clients?.find(c => c.port_number === portNum);
                  const isActive = client?.status === 'active';
                  const isInactive = client?.status === 'inactive';

                  return (
                    <button
                      key={portNum}
                      onClick={() => handlePortClick(portNum)}
                      className={cn(
                        "aspect-square rounded-lg flex flex-col items-center justify-center border-2 transition-all relative group",
                        !client && "border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-slate-400",
                        isActive && "border-emerald-500 bg-emerald-50 text-emerald-700",
                        isInactive && "border-amber-500 bg-amber-50 text-amber-700"
                      )}
                    >
                      <span className="text-lg font-bold">{portNum}</span>
                      {client && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-current" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 flex gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border border-slate-300 bg-white" />
                  <span className="text-slate-600">Livre</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-600">Ocupado (Ativo)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-slate-600">Ocupado (Inativo)</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Info Panel */}
          <div>
            <Card className="p-6 h-full">
              <h3 className="text-lg font-semibold mb-4">Resumo</h3>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="text-sm text-slate-500">Total de Portas</div>
                  <div className="text-2xl font-bold text-slate-900">{cto.total_ports}</div>
                </div>
                <div className="p-4 bg-emerald-50 rounded-lg">
                  <div className="text-sm text-emerald-600">Clientes Ativos</div>
                  <div className="text-2xl font-bold text-emerald-700">
                    {cto.clients?.filter(c => c.status === 'active').length || 0}
                  </div>
                </div>
                <div className="p-4 bg-white border border-slate-200 rounded-lg">
                  <div className="text-sm text-slate-500">Portas Livres</div>
                  <div className="text-2xl font-bold text-slate-900">
                    {cto.total_ports - (cto.clients?.length || 0)}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Porta</th>
                  <th className="px-6 py-3">Nome</th>
                  <th className="px-6 py-3">PPPoE</th>
                  <th className="px-6 py-3">Endereço</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {cto.clients && cto.clients.length > 0 ? (
                  cto.clients.sort((a, b) => a.port_number - b.port_number).map((client) => (
                    <tr key={client.id} className="bg-white border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">#{client.port_number}</td>
                      <td className="px-6 py-4">{client.name}</td>
                      <td className="px-6 py-4 font-mono text-xs">{client.pppoe || '-'}</td>
                      <td className="px-6 py-4 truncate max-w-xs">{client.address}</td>
                      <td className="px-6 py-4"><Badge status={client.status} /></td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handlePortClick(client.port_number)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      Nenhum cliente cadastrado nesta CTO.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Client Modal */}
      {selectedPort !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">Porta {selectedPort}</h2>
                <p className="text-slate-500 text-sm">{existingClient ? 'Detalhes do Cliente' : 'Vincular Cliente'}</p>
              </div>
              <button onClick={() => setSelectedPort(null)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Cliente</label>
                <input
                  required
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Nome completo"
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">UsuÃ¡rio PPPoE</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                  placeholder="usuario@provedor"
                  value={clientForm.pppoe}
                  onChange={(e) => setClientForm({ ...clientForm, pppoe: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Endereço da instalação"
                  value={clientForm.address}
                  onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={clientForm.status}
                  onChange={(e) => setClientForm({ ...clientForm, status: e.target.value as 'active' | 'inactive' })}
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                {existingClient && (
                  <Button type="button" variant="danger" onClick={handleDeleteClient} className="mr-auto">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                <Button type="button" variant="secondary" onClick={() => setSelectedPort(null)}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Preferences({ onTabChange, onShowUnits, onShowImport }: {
  onTabChange: (tab: string) => void,
  onShowUnits: () => void,
  onShowImport: () => void
}) {
  const navigate = useNavigate();
  const [showCTOModal, setShowCTOModal] = useState(false);
  const [showManageCities, setShowManageCities] = useState(false);
  const [showManageCTOs, setShowManageCTOs] = useState(false);

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-0">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Preferências</h1>
        <p className="text-slate-500 text-sm">Central de gerenciamento e configurações.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Gestão de Usuários */}
        <Card className="p-6 hover:border-indigo-500 transition-all cursor-pointer group" onClick={() => onTabChange('users')}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Gerenciar Usuários</h3>
              <p className="text-xs text-slate-500">Controle de acessos.</p>
            </div>
          </div>
        </Card>

        {/* Cidades */}
        <div className="space-y-2">
          <Card className="p-6 hover:border-indigo-500 transition-all cursor-pointer group" onClick={() => navigate('/?tab=new')}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Cadastrar Cidade</h3>
                <p className="text-xs text-slate-500">Adicionar nova cidade à rede.</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer text-center text-xs font-bold text-indigo-600 border border-slate-200 rounded-lg" onClick={() => setShowManageCities(true)}>
            EDITAR / EXCLUIR CIDADES EXISTENTES
          </Card>
        </div>

        {/* CTOs */}
        <div className="space-y-2">
          <Card className="p-6 border-2 border-indigo-600 bg-indigo-50 hover:border-indigo-500 transition-all cursor-pointer group" onClick={() => setShowCTOModal(true)}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-sm">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Cadastrar Nova CTO</h3>
                <p className="text-xs text-slate-500">Adicionar caixa em uma cidade.</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer text-center text-xs font-bold text-indigo-600 border border-slate-200 rounded-lg" onClick={() => setShowManageCTOs(true)}>
            EDITAR / EXCLUIR CTO'S EXISTENTES
          </Card>
        </div>

        {/* Unidades */}
        <Card className="p-6 hover:border-indigo-500 transition-all cursor-pointer group" onClick={onShowUnits}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Gerenciar Unidades</h3>
              <p className="text-xs text-slate-500">Adicionar ou remover unidades.</p>
            </div>
          </div>
        </Card>

        {/* Importar */}
        <Card className="p-6 hover:border-indigo-500 transition-all cursor-pointer group" onClick={onShowImport}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Importar Dados</h3>
              <p className="text-xs text-slate-500">Carregar planilha Excel.</p>
            </div>
          </div>
        </Card>
      </div>

      {showCTOModal && <GlobalCTOModal onClose={() => setShowCTOModal(false)} />}
      {showManageCities && <ManageCitiesModal onClose={() => setShowManageCities(false)} />}
      {showManageCTOs && <ManageCTOsModal onClose={() => setShowManageCTOs(false)} />}
    </div>
  );
}

function ManageCitiesModal({ onClose }: { onClose: () => void }) {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCity, setEditingCity] = useState<City | null>(null);

  const fetchCities = async () => {
    const res = await authFetch('/api/cities');
    const data = await res.json();
    setCities(data);
    setLoading(false);
  };

  useEffect(() => { fetchCities(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir esta cidade e todas as suas CTOs?')) return;
    const res = await authFetch(`/api/cities/${id}`, { method: 'DELETE' });
    if (res.ok) fetchCities();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-6 shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Gerenciar Cidades</h2>
          <Button variant="ghost" onClick={onClose} className="!p-1"><XCircle /></Button>
        </div>
        <div className="flex-1 overflow-auto space-y-2 pr-2">
          {loading ? <div className="text-center py-4">Carregando...</div> :
            cities.map(city => (
              <div key={city.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="font-bold text-slate-800">{city.name}</span>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Unidade: {city.unit_id || 'Nenhuma'}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" className="!p-2" onClick={() => setEditingCity(city)}><Edit2 size={14} /></Button>
                  <Button variant="danger" className="!p-2" onClick={() => handleDelete(city.id)}><Trash2 size={14} /></Button>
                </div>
              </div>
            ))
          }
        </div>
        {editingCity && (
          <div className="absolute inset-0 bg-white p-6 z-10">
            <h3 className="font-bold mb-4">Editando: {editingCity.name}</h3>
            <input
              className="w-full p-2 border rounded mb-4"
              defaultValue={editingCity.name}
              id="edit-city-name"
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditingCity(null)}>Cancelar</Button>
              <Button onClick={async () => {
                const newName = (document.getElementById('edit-city-name') as HTMLInputElement).value;
                const res = await authFetch(`/api/cities/${editingCity.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: newName.toUpperCase() })
                });
                if (res.ok) { setEditingCity(null); fetchCities(); }
              }}>Salvar</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function ManageCTOsModal({ onClose }: { onClose: () => void }) {
  const [ctos, setCtos] = useState<CTO[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const searchCTOs = async () => {
    if (search.length < 2) return;
    setLoading(true);
    const res = await authFetch(`/api/search?q=${search}`);
    const data = await res.json();
    // Filter only CTOs
    setCtos(data.filter((i: any) => i.type === 'cto'));
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(searchCTOs, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir esta CTO?')) return;
    const res = await authFetch(`/api/ctos/${id}`, { method: 'DELETE' });
    if (res.ok) searchCTOs();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-6 shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Gerenciar CTO's</h2>
          <Button variant="ghost" onClick={onClose} className="!p-1"><XCircle /></Button>
        </div>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar por nome da CTO..."
            className="w-full p-3 border rounded-xl"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-auto space-y-2 pr-2">
          {ctos.length === 0 ? <p className="text-center text-slate-400 py-8 text-sm">Digite pelo menos 2 letras para buscar...</p> :
            ctos.map(cto => (
              <div key={cto.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="font-bold text-slate-800">{cto.name}</span>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">{cto.address || 'Sem endereço'}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="danger" className="!p-2" onClick={() => handleDelete(cto.id)}><Trash2 size={14} /></Button>
                </div>
              </div>
            ))
          }
        </div>
      </Card>
    </div>
  );
}

function GlobalCTOModal({ onClose }: { onClose: () => void }) {
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCityId, setSelectedCityId] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [ports, setPorts] = useState(16);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCities = async () => {
      const res = await authFetch('/api/cities');
      const data = await res.json();
      setCities(data);
    };
    fetchCities();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCityId) return alert('Selecione uma cidade');
    setLoading(true);
    try {
      const res = await authFetch('/api/ctos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city_id: selectedCityId,
          name: name.trim().toUpperCase(),
          address: address.trim(),
          total_ports: ports
        })
      });
      if (res.ok) {
        alert('CTO cadastrada com sucesso!');
        onClose();
      } else {
        const err = await res.json();
        alert('Erro: ' + err.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Cadastrar Nova CTO</h2>
          <Button variant="ghost" onClick={onClose} className="!p-1"><XCircle className="text-slate-400" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cidade Destino</label>
            <select required className="w-full px-4 py-2 border rounded-lg" value={selectedCityId} onChange={e => setSelectedCityId(e.target.value)}>
              <option value="">Selecione...</option>
              {cities.map(city => <option key={city.id} value={city.id}>{city.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome da CTO</label>
            <input required className="w-full px-4 py-2 border rounded-lg" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: CTO-01" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
            <input required className="w-full px-4 py-2 border rounded-lg" value={address} onChange={e => setAddress(e.target.value)} placeholder="Rua..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Portas</label>
            <select className="w-full px-4 py-2 border rounded-lg" value={ports} onChange={e => setPorts(Number(e.target.value))}>
              <option value={8}>8 Portas</option>
              <option value={16}>16 Portas</option>
              <option value={24}>24 Portas</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-6">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>Salvar CTO</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function UnitModal({ onClose }: { onClose: () => void }) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [newUnitName, setNewUnitName] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUnits = async () => {
    const res = await authFetch('/api/units');
    const data = await res.json();
    setUnits(data);
    setLoading(false);
  };

  useEffect(() => { fetchUnits(); }, []);

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim()) return;
    const res = await authFetch('/api/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newUnitName })
    });
    if (res.ok) {
      setNewUnitName('');
      fetchUnits();
    }
  };

  const handleDeleteUnit = async (id: number) => {
    if (!confirm('Excluir unidade?')) return;
    const res = await authFetch(`/api/units/${id}`, { method: 'DELETE' });
    if (res.ok) fetchUnits();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900">Gerenciar Unidades</h2>
          <Button variant="ghost" onClick={onClose} className="!p-1"><XCircle /></Button>
        </div>
        <form onSubmit={handleAddUnit} className="flex gap-2 mb-6">
          <input
            type="text"
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg outline-none"
            placeholder="Nova Unidade"
            value={newUnitName}
            onChange={(e) => setNewUnitName(e.target.value)}
          />
          <Button type="submit"><Plus /></Button>
        </form>
        <div className="space-y-2 max-h-60 overflow-auto">
          {units.map(unit => (
            <div key={unit.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="font-medium text-slate-700">{unit.name}</span>
              <button onClick={() => handleDeleteUnit(unit.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ImportModal({ onClose }: { onClose: () => void }) {
  const [importing, setImporting] = useState(false);

  const handleImport = async (type: 'clients' | 'ctos') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImporting(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        try {
          const res = await authFetch(`/api/import/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: content })
          });
          if (res.ok) alert('Dados importados!');
          else alert('Erro na importação.');
        } catch (err) { alert('Erro no processamento.'); }
        setImporting(false);
        onClose();
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm p-8 text-center">
        <h2 className="text-xl font-bold mb-6">Importar Dados</h2>
        <div className="space-y-3">
          <Button onClick={() => handleImport('ctos')} className="w-full" variant="secondary" disabled={importing}>
            Importar CTOs (.csv)
          </Button>
          <Button onClick={() => handleImport('clients')} className="w-full" variant="secondary" disabled={importing}>
            Importar Clientes (.csv)
          </Button>
          <Button onClick={onClose} variant="ghost" className="w-full mt-4">Cancelar</Button>
        </div>
      </Card>
    </div>
  );
}

function ViabilityCheck({ fields, setFields }: {
  fields: any,
  setFields: React.Dispatch<React.SetStateAction<any>>
}) {
  const navigate = useNavigate();
  const [radius, setRadius] = useState(0.5);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<(any & { distance: number })[]>([]);
  const [searched, setSearched] = useState(false);
  const [searchPoint, setSearchPoint] = useState<{ lat: number, lng: number } | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Filtrar campos vazios para geocoding mais preciso
    const addressParts = [fields.rua, fields.numero, fields.bairro, fields.cidade, fields.estado, fields.cep]
      .filter(part => part && part.trim() !== '');

    if (addressParts.length === 0) return;

    const fullAddress = addressParts.join(', ');

    setLoading(true);
    setSearched(true);
    setResults([]);

    try {
      const geoRes = await authFetch(`/api/geocode?q=${encodeURIComponent(fullAddress)}`);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        setSearchPoint({ lat: geoData.lat, lng: geoData.lng });
        const res = await authFetch(`/api/viability?lat=${geoData.lat}&lng=${geoData.lng}&radius=${radius}`);
        const data = await res.json();
        if (Array.isArray(data)) setResults(data);
      } else {
        alert("Endereço não localizado. Tente simplificar a busca.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setSearchPoint({ lat, lng });
      setFields({ ...fields, rua: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Consulta de Viabilidade</h1>
        <p className="text-slate-500">Encontre as CTOs mais próximas com portas disponíveis.</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-slate-700 mb-1">Rua / Logradouro</label>
              <input
                type="text"
                placeholder="Ex: Rua das Flores / Lat Long"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={fields.rua}
                onChange={(e) => setFields({ ...fields, rua: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Número</label>
              <input
                type="text"
                placeholder="123"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={fields.numero}
                onChange={(e) => setFields({ ...fields, numero: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bairro</label>
              <input
                type="text"
                placeholder="Centro"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={fields.bairro}
                onChange={(e) => setFields({ ...fields, bairro: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
              <input
                type="text"
                placeholder="Ex: Campina Grande"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={fields.cidade}
                onChange={(e) => setFields({ ...fields, cidade: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
              <input
                type="text"
                placeholder="PB"
                maxLength={2}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                value={fields.estado}
                onChange={(e) => setFields({ ...fields, estado: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
              <input
                type="text"
                placeholder="00000-000"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={fields.cep}
                onChange={(e) => setFields({ ...fields, cep: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Raio de busca (km): {radius}km</label>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                value={radius}
                onChange={(e) => setRadius(parseFloat(e.target.value))}
              />
            </div>

            <div className="md:col-span-2 flex items-end gap-2">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Consultando...' : 'Verificar Viabilidade'}
              </Button>
              <Button type="button" variant="secondary" onClick={handleGetCurrentLocation} title="Usar localização atual">
                <Locate className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {searched && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Filter className="w-5 h-5 text-indigo-500" />
            Resultados da Busca
          </h3>

          {loading ? (
            <div className="text-center py-12 text-slate-500">Buscando CTOs próximas...</div>
          ) : results.length === 0 ? (
            <Card className="p-12 text-center text-slate-500 bg-slate-50 border-dashed">
              <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p>Nenhuma CTO encontrada neste raio com portas disponíveis.</p>
              <p className="text-sm mt-1">Tente aumentar o raio de busca.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {results.map((cto) => {
                const availablePorts = cto.total_ports - (cto.used_ports || 0);
                const isFull = availablePorts <= 0;
                const occupancy = (cto.used_ports / cto.total_ports) * 100;

                return (
                  <Card key={cto.id} className={cn("transition-all", isFull ? "opacity-60 bg-slate-50/50" : "hover:shadow-md border-l-4 border-l-indigo-500")}>
                    <div className="p-4">
                      {/* Top Info */}
                      <div className="flex items-start gap-4 mb-4">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", isFull ? "bg-slate-200 text-slate-500" : "bg-indigo-100 text-indigo-600")}>
                          <Server className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-lg text-slate-900 truncate">{cto.name}</h4>
                          <p className="text-sm text-slate-500 flex items-center gap-1">
                            <Navigation className="w-3 h-3" />
                            {cto.distance.toFixed(3)} km {cto.is_route ? '(por rota)' : '(raio)'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <AddressDisplay address={cto.address} className="text-xs" />
                            <a
                              href={`https://www.google.com/maps?q=${cto.latitude},${cto.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-indigo-600 font-bold hover:underline"
                            >
                              Ver no Mapa
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Stats & Actions */}
                      <div className="flex flex-col gap-4">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Ocupação</span>
                            <span className={cn("text-xs font-bold", isFull ? "text-red-600" : "text-emerald-600")}>
                              {availablePorts} Portas Disponíveis
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full transition-all duration-500",
                                  occupancy >= 90 ? "bg-red-500" : occupancy >= 70 ? "bg-amber-500" : "bg-emerald-500"
                                )}
                                style={{ width: `${occupancy}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-700">{occupancy.toFixed(0)}%</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {!isFull && (
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&origin=${searchPoint?.lat},${searchPoint?.lng}&destination=${cto.latitude},${cto.longitude}&travelmode=walking`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors uppercase shadow-sm"
                            >
                              Traçar Rota <Navigation className="w-4 h-4" />
                            </a>
                          )}
                          <Button
                            variant="secondary"
                            className="flex-1 text-xs font-bold uppercase"
                            onClick={() => navigate(`/cto/${cto.id}`)}
                          >
                            Acessar CTO
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  );
}

function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<(any & { type: 'client' | 'cto'; cto_name: string; city_name: string })[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const [viabilityFields, setViabilityFields] = useState({ rua: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' });

  useEffect(() => {
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    const loginTime = localStorage.getItem('login_time');

    if (user && !loginTime) {
      localStorage.setItem('login_time', Date.now().toString());
    }

    const checkInterval = setInterval(() => {
      const storedTime = localStorage.getItem('login_time');
      if (storedTime && (Date.now() - parseInt(storedTime)) > SIX_HOURS) {
        logout();
        localStorage.removeItem('login_time');
      }
    }, 60000);

    return () => clearInterval(checkInterval);
  }, [user, logout]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        try {
          const res = await authFetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
          const data = await res.json();
          setSearchResults(data);
          setShowResults(true);
        } catch (error) {
          console.error(error);
        }
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const menuItems = [
    { id: 'infrastructure', label: "CTO's", icon: Server, path: '/' },
    { id: 'viability', label: 'Consulta Viabilidade', icon: Map, path: '/viability' },
    { id: 'preferences', label: 'Preferências', icon: Settings, path: '/preferences', roles: ['admin'] },
  ];

  const allowedItems = menuItems.filter(item => !item.roles || item.roles.includes(user?.role || ''));

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" onClick={() => setShowResults(false)}>
      {/* Sidebar */}
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed md:relative bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-50 h-full shadow-2xl md:shadow-none",
        isSidebarOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0 w-72 md:w-20 overflow-hidden"
      )}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-indigo-600 p-1.5 rounded-lg text-white shrink-0">
              <Server size={24} />
            </div>
            <span className="font-bold text-lg text-slate-800 truncate">Gestão CTO</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 hover:bg-slate-100 rounded-lg">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {allowedItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-xl transition-all group",
                location.pathname === item.path
                  ? "bg-indigo-50 text-indigo-600 font-bold"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon size={20} className={cn(
                "shrink-0",
                location.pathname === item.path ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
              )} />
              {isSidebarOpen && <span className="truncate">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 p-3 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
              {user?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{user?.name || 'Usuário'}</p>
                <p className="text-xs text-slate-500 truncate capitalize">{user?.role === 'admin' ? 'Gestor' : user?.role === 'tech' ? 'Técnico' : 'Vendedor'}</p>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all mt-2",
              !isSidebarOpen && "justify-center"
            )}
          >
            <XCircle size={20} />
            {isSidebarOpen && <span className="font-medium">Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
            >
              <Filter size={20} className={cn("transition-transform", !isSidebarOpen && "rotate-180")} />
            </button>

            {/* Search Bar */}
            <div className="relative w-full max-w-md flex-1" onClick={e => e.stopPropagation()}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 text-sm transition-colors"
                placeholder="Buscar clientes ou CTOs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
              />

              {showResults && searchResults.length > 0 && (
                <div className="absolute mt-1 w-full bg-white shadow-xl rounded-lg border border-slate-200 py-1 z-50 max-h-96 overflow-auto">
                  {searchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                      onClick={() => {
                        navigate(`/cto/${result.cto_id || result.id}`);
                        setShowResults(false);
                        setSearchQuery('');
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          {result.type === 'cto' ? <Server className="w-4 h-4 text-indigo-500" /> : <Users className="w-4 h-4 text-slate-400" />}
                          <span className="font-medium text-slate-900">{result.name}</span>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-slate-100 text-slate-600">
                          {result.type === 'cto' ? 'CTO' : 'Cliente'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {result.city_name} • {result.address}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Indicador Online Removido */}
          </div>
        </header>

        <div className="p-4 sm:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/viability" element={<ViabilityCheck fields={viabilityFields} setFields={setViabilityFields} />} />
            <Route path="/city/:id" element={<CityView />} />
            <Route path="/cto/:id" element={<CTODetail />} />
            <Route path="/preferences" element={
              <ProtectedRoute roles={['admin']}>
                <Preferences
                  onTabChange={(tab) => navigate(tab === 'users' ? '/users' : '/')}
                  onShowUnits={() => setShowUnitModal(true)}
                  onShowImport={() => setShowImportModal(true)}
                />
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute roles={['admin']}>
                <UserManagement />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </main>

      {showUnitModal && <UnitModal onClose={() => setShowUnitModal(false)} />}
      {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} />}
    </div>
  );
}

