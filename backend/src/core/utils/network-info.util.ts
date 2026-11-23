import os from 'os';

export interface NetworkAddress {
  interfaz: string;
  ip: string;
  tipo: 'wifi' | 'ethernet' | 'otra';
}

const VIRTUAL_RE = /virtual|vethernet|vmware|vbox|hyper-v|loopback|wsl|docker|tailscale|zerotier|hamachi|bluetooth/i;
const WIFI_RE = /wi-?fi|wlan|inal[aá]mbrica|wireless/i;
const ETH_RE = /ethernet|eth\d*|lan|local/i;

/** Lista las IPv4 de red local (excluye adaptadores virtuales y loopback). Primero Wi-Fi/Ethernet. */
export function getLocalNetworkAddresses(): NetworkAddress[] {
  const nets = os.networkInterfaces();
  const result: NetworkAddress[] = [];

  for (const name of Object.keys(nets)) {
    if (VIRTUAL_RE.test(name)) continue;
    for (const net of nets[name] || []) {
      const family = String(net.family);
      if ((family !== 'IPv4' && family !== '4') || net.internal) continue;
      if (net.address.startsWith('169.254.')) continue; // APIPA (sin DHCP)
      const tipo: NetworkAddress['tipo'] = WIFI_RE.test(name) ? 'wifi' : (ETH_RE.test(name) ? 'ethernet' : 'otra');
      result.push({ interfaz: name, ip: net.address, tipo });
    }
  }

  const rank = (t: NetworkAddress['tipo']) => (t === 'ethernet' ? 0 : t === 'wifi' ? 1 : 2);
  const isPrivate = (ip: string) => /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
  return result.sort((a, b) => {
    const p = Number(isPrivate(b.ip)) - Number(isPrivate(a.ip));
    return p !== 0 ? p : rank(a.tipo) - rank(b.tipo);
  });
}

export function getNetworkInfo(port: number) {
  const direcciones = getLocalNetworkAddresses();
  const principal = direcciones[0]?.ip || 'localhost';
  return {
    app: 'yiyo-burger-pos',
    hostname: os.hostname(),
    puerto: port,
    ip_principal: principal,
    url_principal: `http://${principal}:${port}`,
    direcciones: direcciones.map(d => ({ ...d, url: `http://${d.ip}:${port}` })),
  };
}
