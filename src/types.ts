export interface Unit {
  id: number;
  name: string;
}

export interface City {
  id: number;
  name: string;
  unit_id: number | null;
}

export interface CTO {
  id: number;
  name: string;
  city_id: number;
  total_ports: number;
  address: string;
  latitude?: number;
  longitude?: number;
  used_ports?: number;
  clients?: Client[];
}

export interface Client {
  id: number;
  name: string;
  address: string;
  pppoe?: string;
  city_id: number;
  cto_id: number;
  port_number: number;
  status: 'active' | 'inactive';
  created_at: string;
}
