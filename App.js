import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, Image, ActivityIndicator,
  StyleSheet, SafeAreaView, RefreshControl, Switch, Platform, Share,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { C, money } from './src/theme';
import * as api from './src/api';

const EXT_TO_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic' };

export const STATUS_LABEL = { recebido: 'Recebido', preparando: 'Preparando', pronto: 'Pronto', entregue: 'Entregue', cancelado: 'Cancelado' };
export const NEXT_STATUS = { recebido: 'preparando', preparando: 'pronto', pronto: 'entregue' };
export const NEXT_LABEL = { recebido: 'Iniciar preparo', preparando: 'Marcar como pronto', pronto: 'Marcar como entregue' };

// Função pura: decide qual filtro de status mandar para a API, dado o filtro escolhido na tela.
export function statusParamFor(filter) {
  return filter === 'ativos' ? 'recebido,preparando,pronto' : filter;
}

// Função pura: monta o nome de validação do formulário de produto (usada pelo ProductForm).
export function validateProduct(f) {
  if (!f.name || !f.name.trim()) return 'Preencha nome e preço.';
  if (!Number(f.price)) return 'Preencha nome e preço.';
  return null;
}

export function Btn({ label, onPress, variant = 'solid', style, disabled, a11yLabel }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8}
      accessibilityRole="button" accessibilityLabel={a11yLabel || label} accessibilityState={{ disabled: !!disabled }}
      style={[s.btn, variant === 'light' && s.btnLight, variant === 'ghost' && s.btnGhost, disabled && { opacity: 0.4 }, style]}>
      <Text style={[s.btnText, variant === 'light' && { color: C.brown }, variant === 'ghost' && { color: C.brown }]}>{label}</Text>
    </Pressable>
  );
}
export function Field({ label, ...props }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={s.input} placeholderTextColor={C.muted} accessibilityLabel={label} {...props} />
    </View>
  );
}

// ---------------- LOGIN ----------------
function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true); setError('');
    try { const r = await api.login(email.trim(), password); onLogin(r.access_token); }
    catch (e) { setError(e.message); }
    setLoading(false);
  };
  return (
    <SafeAreaView style={s.page}>
      <View style={s.loginWrap}>
        <Text style={s.logo}>NANINI'S CAFÉ</Text>
        <Text style={s.muted}>Área da equipe</Text>
        <Field label="E-mail" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="voce@naninis.com" />
        <Field label="Senha" secureTextEntry value={password} onChangeText={setPassword} placeholder="••••••••" />
        {error ? <Text style={s.error}>{error}</Text> : null}
        <Btn label={loading ? 'Entrando…' : 'Entrar'} onPress={submit} />
      </View>
    </SafeAreaView>
  );
}

async function saveCsv(filename, text) {
  if (Platform.OS === 'web') {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  } else {
    // No celular, abre o menu de compartilhar (salvar em Arquivos, enviar por e-mail/WhatsApp etc.)
    await Share.share({ title: filename, message: text });
  }
}

// ---------------- PEDIDOS ----------------
const FILTERS = [['ativos', 'Em andamento'], ['entregue', 'Entregues'], ['', 'Todos']];
const PAGE_SIZE = 10;

function OrdersTab({ token }) {
  const [filter, setFilter] = useState('ativos');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [range, setRange] = useState({ start: '', end: '' });

  const statusParam = statusParamFor(filter);

  const load = useCallback(async () => {
    setError('');
    try { setResult(await api.getOrders(token, { status: statusParam, page, page_size: PAGE_SIZE })); }
    catch (e) { setError(e.message); }
    setLoading(false);
  }, [token, statusParam, page]);

  useEffect(() => { setLoading(true); load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);
  useEffect(() => { setPage(1); }, [filter]);

  const advance = async (o) => {
    try { await api.setOrderStatus(token, o.id, NEXT_STATUS[o.status]); load(); }
    catch (e) { setError(e.message); }
  };

  const exportCsv = async () => {
    setExporting(true); setError('');
    try {
      const { text, filename } = await api.exportOrdersCsv(token, {
        status: statusParam, start_date: range.start, end_date: range.end,
      });
      await saveCsv(filename, text);
    } catch (e) { setError(e.message); }
    setExporting(false);
  };

  const { items: orders, total, pages } = result;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabs} contentContainerStyle={{ paddingHorizontal: 12 }}
        accessibilityRole="tablist">
        {FILTERS.map(([k, l]) => (
          <Pressable key={k} onPress={() => setFilter(k)} style={[s.chip, filter === k && s.chipOn]}
            accessibilityRole="tab" accessibilityLabel={`Filtrar: ${l}`} accessibilityState={{ selected: filter === k }}>
            <Text style={[s.chipText, filter === k && { color: C.yellow }]}>{l}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {loading ? <ActivityIndicator color={C.brown} style={{ marginTop: 30 }} /> : (
        <ScrollView contentContainerStyle={s.wrap} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
          {error ? <Text style={s.error}>{error}</Text> : null}

          <View style={s.card}>
            <Text style={s.cardTitle}>Exportar CSV</Text>
            <Text style={[s.muted, { marginBottom: 8 }]}>Exporta os pedidos do filtro "{FILTERS.find(([k]) => k === filter)[1]}" acima, com período opcional.</Text>
            <View style={s.row}>
              <TextInput style={[s.input, { flex: 1, marginRight: 8 }]} placeholder="Data inicial (AAAA-MM-DD)" value={range.start} onChangeText={(v) => setRange({ ...range, start: v })} />
              <TextInput style={[s.input, { flex: 1 }]} placeholder="Data final (AAAA-MM-DD)" value={range.end} onChangeText={(v) => setRange({ ...range, end: v })} />
            </View>
            <Btn label={exporting ? 'Exportando…' : 'Exportar CSV'} variant="light" onPress={exportCsv} style={{ marginTop: 10 }} />
          </View>

          <Text style={s.muted}>{total} pedido{total === 1 ? '' : 's'} encontrado{total === 1 ? '' : 's'}</Text>
          {orders.length === 0 && <Text style={s.muted}>Nenhum pedido por aqui.</Text>}
          {orders.map((o) => (
            <View key={o.id} style={s.card}>
              <View style={s.row}>
                <Text style={s.cardTitle}>#{o.id} • {o.customer_name}</Text>
                <View style={[s.badge, o.status === 'entregue' && { backgroundColor: C.muted }]}>
                  <Text style={s.badgeText}>{STATUS_LABEL[o.status]}</Text>
                </View>
              </View>
              <Text style={s.muted}>{o.order_type === 'local' ? `Mesa ${o.table_number || '-'}` : 'Para levar'} • {new Date(o.created_at).toLocaleTimeString().slice(0, 5)}</Text>
              {o.items.map((it, i) => (
                <Text key={i} style={s.itemLine}>{it.quantity}× {it.name}</Text>
              ))}
              {o.notes ? <Text style={s.notes}>Obs: {o.notes}</Text> : null}
              <View style={s.row}>
                <Text style={s.cardTotal}>{money(o.total)}</Text>
                {NEXT_STATUS[o.status] && <Btn label={NEXT_LABEL[o.status]} variant="light" onPress={() => advance(o)} />}
              </View>
            </View>
          ))}
          {pages > 1 && (
            <View style={[s.row, { justifyContent: 'center', gap: 16, marginTop: 4 }]}
              accessible accessibilityLabel={`Página ${page} de ${pages}`}>
              <Btn label="‹ Anterior" variant="ghost" disabled={page <= 1} a11yLabel="Página anterior"
                onPress={() => setPage((p) => Math.max(1, p - 1))} />
              <Text style={s.itemLine}>Página {page} de {pages}</Text>
              <Btn label="Próxima ›" variant="ghost" disabled={page >= pages} a11yLabel="Próxima página"
                onPress={() => setPage((p) => Math.min(pages, p + 1))} />
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ---------------- CARDÁPIO ----------------
const BLANK = { name: '', description: '', price: '', image_url: '', category_id: null, active: true };

function ProductForm({ token, categories, product, onDone, onCancel }) {
  const [f, setF] = useState(product ? { ...product, price: String(product.price) } : BLANK);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const pickImage = async () => {
    setError('');
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setError('Precisamos de acesso à galeria para escolher a foto.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.5, allowsEditing: true, aspect: [4, 3],
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const ext = (asset.fileName || asset.uri).split('.').pop().toLowerCase().split('?')[0];
    const contentType = asset.mimeType || EXT_TO_MIME[ext] || 'image/jpeg';
    setUploading(true);
    try {
      const { url } = await api.uploadImage(token, { filename: `produto.${ext || 'jpg'}`, content_base64: asset.base64, content_type: contentType });
      setF((prev) => ({ ...prev, image_url: url }));
    } catch (e) { setError(e.message); }
    setUploading(false);
  };

  const save = async () => {
    const validationError = validateProduct(f);
    if (validationError) { setError(validationError); return; }
    setSaving(true); setError('');
    const payload = { ...f, price: Number(f.price), category_id: f.category_id || categories[0]?.id || null };
    try {
      if (product) await api.editProduct(token, product.id, payload);
      else await api.addProduct(token, payload);
      onDone();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{product ? 'Editar produto' : 'Novo produto'}</Text>
      <Field label="Título" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} placeholder="Ex.: Cappuccino Cremoso" />
      <Field label="Descrição" value={f.description} onChangeText={(v) => setF({ ...f, description: v })} placeholder="Ex.: Espuma de leite e canela" multiline />
      <Field label="Preço (R$)" value={f.price} onChangeText={(v) => setF({ ...f, price: v.replace(',', '.') })} keyboardType="decimal-pad" placeholder="11.00" />

      <Text style={s.label}>Foto</Text>
      {f.image_url ? <Image source={{ uri: f.image_url }} style={{ width: '100%', height: 140, borderRadius: 10, marginBottom: 8 }} /> : null}
      <Btn label={uploading ? 'Enviando…' : 'Escolher da galeria'} variant="light" onPress={pickImage} style={{ marginBottom: 12 }} />
      {uploading && <ActivityIndicator color={C.brown} style={{ marginBottom: 12 }} />}
      <Field label="ou cole o link da foto" value={f.image_url} onChangeText={(v) => setF({ ...f, image_url: v })} placeholder="https://…" autoCapitalize="none" />
      <Text style={s.label}>Categoria</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {categories.map((c) => (
          <Pressable key={c.id} onPress={() => setF({ ...f, category_id: c.id })} style={[s.chip, f.category_id === c.id && s.chipOn, { marginRight: 8 }]}
            accessibilityRole="radio" accessibilityLabel={`Categoria ${c.name}`} accessibilityState={{ selected: f.category_id === c.id }}>
            <Text style={[s.chipText, f.category_id === c.id && { color: C.yellow }]}>{c.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={[s.row, { marginBottom: 12 }]}>
        <Text style={s.label} nativeID="lbl-ativo">Disponível no cardápio</Text>
        <Switch value={f.active} onValueChange={(v) => setF({ ...f, active: v })} trackColor={{ true: C.brown }}
          accessibilityLabelledBy="lbl-ativo" accessibilityLabel="Produto disponível no cardápio" />
      </View>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <View style={s.row}>
        <Btn label="Cancelar" variant="ghost" onPress={onCancel} />
        <Btn label={saving ? 'Salvando…' : 'Salvar'} onPress={save} />
      </View>
    </View>
  );
}

function ProductsTab({ token }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(undefined); // undefined=fechado, null=novo, obj=editar
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([api.getProducts(token), api.getCategories()]);
    setProducts(p); setCategories(c); setLoading(false);
  }, [token]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <ActivityIndicator color={C.brown} style={{ marginTop: 30 }} />;
  if (editing !== undefined) {
    return <ScrollView contentContainerStyle={s.wrap}>
      <ProductForm token={token} categories={categories} product={editing} onDone={() => { setEditing(undefined); load(); }} onCancel={() => setEditing(undefined)} />
    </ScrollView>;
  }
  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Btn label="+ Novo produto" onPress={() => setEditing(null)} />
      {products.map((p) => (
        <Pressable key={p.id} onPress={() => setEditing(p)} style={[s.card, { flexDirection: 'row', gap: 12, alignItems: 'center' }]}
          accessibilityRole="button"
          accessibilityLabel={`${p.name}, ${money(p.price)}${p.active ? '' : ', pausado'}. Toque para editar.`}>
          {p.image_url ? <Image source={{ uri: p.image_url }} style={s.thumb} accessible={false} importantForAccessibility="no" />
            : <View style={[s.thumb, { backgroundColor: C.yellow }]} />}
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>{p.name}</Text>
            <Text style={s.muted} numberOfLines={1}>{p.description}</Text>
            <Text style={s.cardTotal}>{money(p.price)}</Text>
          </View>
          {!p.active && <View style={s.badge}><Text style={s.badgeText}>Pausado</Text></View>}
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ---------------- DASHBOARD ----------------
const RANGES = [['1', 'Hoje'], ['7', '7 dias'], ['30', '30 dias'], ['90', '90 dias']];

function Bar({ label, value, max }) {
  const pct = max ? Math.max(6, (value / max) * 100) : 0;
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={s.row}><Text style={s.itemLine}>{label}</Text><Text style={s.itemLine}>{value}</Text></View>
      <View style={{ height: 10, backgroundColor: C.line, borderRadius: 6 }}>
        <View style={{ height: 10, width: `${pct}%`, backgroundColor: C.brown, borderRadius: 6 }} />
      </View>
    </View>
  );
}

function DashboardTab({ token }) {
  const [range, setRange] = useState('7');
  const [custom, setCustom] = useState({ start: '', end: '' });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const params = custom.start ? { start_date: custom.start, end_date: custom.end } : { days: range };
      setData(await api.getDashboard(token, params));
    } catch (e) { setError(e.message); }
  }, [token, range, custom]);
  useEffect(() => { load(); }, [load]);

  const maxQty = data?.top_products?.[0]?.quantity || 1;

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {RANGES.map(([k, l]) => (
          <Pressable key={k} onPress={() => { setCustom({ start: '', end: '' }); setRange(k); }}
            style={[s.chip, range === k && !custom.start && s.chipOn, { marginRight: 8 }]}
            accessibilityRole="radio" accessibilityLabel={`Período: ${l}`} accessibilityState={{ selected: range === k && !custom.start }}>
            <Text style={[s.chipText, range === k && !custom.start && { color: C.yellow }]}>{l}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={s.card}>
        <Text style={s.cardTitle}>Período personalizado</Text>
        <View style={s.row}>
          <TextInput style={[s.input, { flex: 1, marginRight: 8 }]} placeholder="2026-10-01" value={custom.start} onChangeText={(v) => setCustom({ ...custom, start: v })} />
          <TextInput style={[s.input, { flex: 1 }]} placeholder="2026-10-25" value={custom.end} onChangeText={(v) => setCustom({ ...custom, end: v })} />
        </View>
        <Btn label="Aplicar" variant="light" onPress={load} />
        <Text style={[s.muted, { marginTop: 4 }]}>Formato AAAA-MM-DD</Text>
      </View>

      {error ? <Text style={s.error}>{error}</Text> : null}
      {data && (
        <>
          <View style={[s.row, { gap: 10 }]}>
            <View style={[s.kpi]}><Text style={s.kpiLabel}>Faturamento</Text><Text style={s.kpiValue}>{money(data.revenue)}</Text></View>
            <View style={[s.kpi]}><Text style={s.kpiLabel}>Pedidos</Text><Text style={s.kpiValue}>{data.orders}</Text></View>
          </View>
          <View style={s.kpi}><Text style={s.kpiLabel}>Ticket médio</Text><Text style={s.kpiValue}>{money(data.avg_ticket)}</Text></View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Itens mais vendidos</Text>
            {data.top_products.length === 0 && <Text style={s.muted}>Sem vendas no período.</Text>}
            {data.top_products.map((p) => <Bar key={p.name} label={p.name} value={p.quantity} max={maxQty} />)}
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Pedidos por status (período)</Text>
            {Object.entries(data.by_status || {}).map(([k, v]) => (
              <View key={k} style={s.row}><Text style={s.itemLine}>{STATUS_LABEL[k] || k}</Text><Text style={s.itemLine}>{v}</Text></View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ---------------- APP ----------------
const TABS = [['pedidos', 'Pedidos'], ['cardapio', 'Cardápio'], ['dashboard', 'Dashboard']];

export default function App() {
  const [token, setToken] = useState(null);
  const [tab, setTab] = useState('pedidos');

  if (!token) return <Login onLogin={setToken} />;

  return (
    <SafeAreaView style={s.page}>
      <View style={s.header}>
        <Text style={s.logo}>NANINI'S CAFÉ</Text>
        <Pressable onPress={() => setToken(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Sair da conta">
          <Text style={s.logout}>Sair</Text>
        </Pressable>
      </View>
      <View style={s.nav} accessibilityRole="tablist">
        {TABS.map(([k, l]) => (
          <Pressable key={k} onPress={() => setTab(k)} style={[s.navItem, tab === k && s.navItemOn]}
            accessibilityRole="tab" accessibilityLabel={`Aba ${l}`} accessibilityState={{ selected: tab === k }}>
            <Text style={[s.navText, tab === k && { color: C.brown, fontWeight: '800' }]}>{l}</Text>
          </Pressable>
        ))}
      </View>
      {tab === 'pedidos' && <OrdersTab token={token} />}
      {tab === 'cardapio' && <ProductsTab token={token} />}
      {tab === 'dashboard' && <DashboardTab token={token} />}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.cream },
  header: { backgroundColor: C.yellow, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 2, borderColor: C.brown },
  logo: { color: C.brown, fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  logout: { color: C.brown, fontWeight: '700' },
  nav: { flexDirection: 'row', backgroundColor: C.white, borderBottomWidth: 1, borderColor: C.line },
  navItem: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderColor: 'transparent' },
  navItemOn: { borderColor: C.brown },
  navText: { color: C.muted, fontWeight: '700' },
  wrap: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 16, gap: 12 },
  loginWrap: { width: '100%', maxWidth: 360, alignSelf: 'center', padding: 24, marginTop: 80, gap: 4 },
  label: { color: C.brown, fontWeight: '700', marginBottom: 4 },
  input: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 12, fontSize: 15 },
  muted: { color: C.muted, fontSize: 13 },
  error: { color: '#B3261E', marginBottom: 8 },
  btn: { backgroundColor: C.brown, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', marginTop: 8 },
  btnLight: { backgroundColor: C.yellow },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.brown },
  btnText: { color: C.yellow, fontWeight: '800' },
  tabs: { flexGrow: 0, paddingVertical: 10, backgroundColor: C.white },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: C.white, borderWidth: 1, borderColor: C.line },
  chipOn: { backgroundColor: C.brown, borderColor: C.brown },
  chipText: { color: C.brown, fontWeight: '700', fontSize: 13 },
  card: { backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: C.brown, marginBottom: 4 },
  cardTotal: { fontSize: 16, fontWeight: '900', color: C.brown },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemLine: { fontSize: 13, color: C.brown, marginTop: 2 },
  notes: { fontSize: 12, color: C.muted, fontStyle: 'italic', marginTop: 4 },
  badge: { backgroundColor: C.yellow, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '800', color: C.brown },
  thumb: { width: 56, height: 56, borderRadius: 10 },
  kpi: { flex: 1, backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 14, marginBottom: 12 },
  kpiLabel: { fontSize: 12, color: C.muted, fontWeight: '700' },
  kpiValue: { fontSize: 22, fontWeight: '900', color: C.brown, marginTop: 4 },
});
