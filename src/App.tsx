import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Plus, Server, MapPin, Users, Search, ArrowLeft, Trash2, Edit2, CheckCircle, XCircle, ExternalLink, AlertTriangle, ChevronDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Unit, City, CTO, Client } from './types.js';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
  const [activeTab, setActiveTab] = useState('cities');
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
      const res = await fetch('/api/units');
      const data = await res.json();
      if (Array.isArray(data)) setUnits(data);
    } catch (error) {
      console.error('Failed to fetch units', error);
    }
  };

  const fetchCities = async () => {
    try {
      const res = await fetch('/api/cities');
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
    if (!newCityName.trim()) return;

    try {
      const res = await fetch('/api/cities', {
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
        fetchCities();
        setActiveTab('cities');
      } else {
        const err = await res.json();
        alert('Erro ao salvar cidade: ' + err.error);
      }
    } catch (error) {
      console.error('Failed to add city', error);
      alert('Erro de conexão ao tentar salvar a cidade.');
    }
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim()) return;

    try {
      const res = await fetch('/api/units', {
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
      await fetch(`/api/units/${id}`, { method: 'DELETE' });
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
      const res = await fetch(`/api/cities/${editingCity.id}`, {
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
          <h1 className="text-2xl font-bold text-slate-900">Infraestrutura</h1>
          <p className="text-slate-500">Gerencie as unidades e cidades da sua rede.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowImportModal(true)}>
            <Search className="w-4 h-4 mr-2" />
            Importar Dados
          </Button>
          <Button variant="secondary" onClick={() => setShowUnitModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Gerenciar Unidades
          </Button>
        </div>
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'cities', label: 'Lista de Unidades' },
          { id: 'new', label: 'Cadastrar Cidade' },
        ]}
      />

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
                                  <button 
                                    onClick={(e) => handleOpenEditCity(e, city)}
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
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

                      const res = await fetch('/api/import', {
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
      const res = await fetch(`/api/cities/${id}/ctos?page=${page}&limit=100`);
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
      const res = await fetch(`/api/cities/${id}`, {
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
      const res = await fetch('/api/ctos', {
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
      await fetch(`/api/ctos/${editingCTO.id}`, {
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
            <button 
              onClick={() => setIsEditingCity(true)}
              className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
              title="Editar Cidade"
            >
              <Edit2 className="w-4 h-4" />
            </button>
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

      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'ctos', label: 'Lista de CTOs' },
          { id: 'new', label: 'Cadastrar CTO' },
        ]}
      />

      {activeTab === 'new' ? (
        <Card className="p-6 max-w-xl">
          <h2 className="text-xl font-bold mb-4">Nova CTO</h2>
          <form onSubmit={handleAddCTO} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome da CTO</label>
              <input
                required
                type="text"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Ex: CTO-01-CENTRO"
                value={newCTOName}
                onChange={(e) => setNewCTOName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Endereço / Localização</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ex: Rua das Flores, Poste 12"
                  value={newCTOAddress}
                  onChange={(e) => setNewCTOAddress(e.target.value)}
                />
                <Button type="button" variant="secondary" onClick={handleGetLocation} title="Obter minha localização atual">
                  <MapPin className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Número de Portas</label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={newCTOPorts}
                onChange={(e) => setNewCTOPorts(Number(e.target.value))}
              >
                <option value={8}>8 Portas</option>
                <option value={16}>16 Portas</option>
                <option value={24}>24 Portas</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button type="button" variant="secondary" onClick={() => setActiveTab('ctos')}>Cancelar</Button>
              <Button type="submit">Salvar CTO</Button>
            </div>
          </form>
        </Card>
      ) : (
        <>
          {loading ? (
            <div className="text-center py-12 text-slate-500">Carregando...</div>
          ) : ctos.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <Server className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-900">Nenhuma CTO cadastrada</h3>
              <p className="text-slate-500">Adicione uma CTO para começar a documentar.</p>
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
                          <button
                            onClick={(e) => handleOpenEdit(e, cto)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Editar CTO"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
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
                <Button type="submit">Salvar Alterações</Button>
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
      const res = await fetch(`/api/ctos/${id}`);
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
        await fetch(`/api/clients/${existingClient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientForm),
        });
      } else {
        // Create
        await fetch('/api/clients', {
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
      await fetch(`/api/clients/${existingClient.id}`, { method: 'DELETE' });
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Usuário PPPoE</label>
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

// --- Layout & App ---

function Layout() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<(Client & { cto_name: string; city_name: string })[]>([]);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans" onClick={() => setShowResults(false)}>
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0 h-auto md:h-16 py-3 md:py-0">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-8 w-full md:w-auto flex-1">
              <div className="flex items-center justify-between w-full md:w-auto">
                <Link to="/" className="flex items-center gap-2 shrink-0">
                  <div className="bg-indigo-600 p-1.5 rounded-lg">
                    <Server className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg font-bold text-slate-900 tracking-tight">Gestão CTO</span>
                </Link>
                <div className="flex md:hidden items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Online
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="relative w-full md:w-96" onClick={e => e.stopPropagation()}>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                  placeholder="Buscar por nome, endereço, PPPoE ou CTO..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                />
                
                {/* Search Results Dropdown */}
                {showResults && searchResults.length > 0 && (
                  <div className="absolute mt-1 w-full bg-white shadow-lg rounded-lg border border-slate-200 py-1 z-50 max-h-96 overflow-auto">
                    <div className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-100">
                      {searchResults.length} resultados encontrados
                    </div>
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                        onClick={() => {
                          navigate(`/cto/${result.cto_id}`);
                          setShowResults(false);
                          setSearchQuery('');
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-slate-900">{result.name}</span>
                          <Badge status={result.status} />
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {result.city_name} • {result.cto_name} • Porta {result.port_number}
                        </div>
                        {result.pppoe && (
                          <div className="text-xs text-indigo-600 mt-0.5 font-mono">
                            PPPoE: {result.pppoe}
                          </div>
                        )}
                        <div className="text-xs text-slate-400 mt-0.5 truncate">
                          {result.address}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {showResults && searchQuery.length >= 2 && searchResults.length === 0 && (
                  <div className="absolute mt-1 w-full bg-white shadow-lg rounded-lg border border-slate-200 py-4 px-4 text-center text-sm text-slate-500 z-50">
                    Nenhum cliente encontrado.
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Sistema Online
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/city/:id" element={<CityView />} />
          <Route path="/cto/:id" element={<CTODetail />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Layout />
  );
}
