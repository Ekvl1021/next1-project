"use client";
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { apiRequest } from '../lib/api';
import { useUser } from '../context/UserContext';
import EmptyState from './EmptyState';

type Attachment = { name: string; data?: string };
type Submission = { id: string; studentCode: string; answer: string; attachment: Attachment | null; updatedAt: string };
type Item = { id: string; courseId: string; kind: 'assignment' | 'exam'; title: string; description: string; dueAt: string; createdBy: string; attachment: Attachment | null; submissions: Submission[] };
type Data = { courses: { id: string; title: string; teacher?: string; canSubmit?: boolean }[]; items: Item[] };
async function readFile(file: File | undefined): Promise<Attachment | null> {
  if (!file || !file.size) return null;
  if (file.size > 5 * 1024 * 1024) throw new Error('Файлын хэмжээ 5 MB-аас их байна.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, data: String(reader.result).split(',')[1] });
    reader.onerror = () => reject(new Error('Файлыг уншиж чадсангүй.'));
    reader.readAsDataURL(file);
  });
}
const date = (value: string) => new Date(value).toLocaleString('mn-MN');
export default function AssessmentManager({ kind }: { kind: Item['kind'] }) {
  const { session } = useUser();
  const teacher = session?.role === 'teacher';
  const label = kind === 'exam' ? 'Шалгалт' : 'Даалгавар';
  const [data, setData] = useState<Data>({ courses: [], items: [] });
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Item | null>(null);
  const [title, setTitle] = useState(''), [description, setDescription] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await apiRequest<Data>('/api/assessments', { cache: 'no-store' })); }
    catch (e) { setError(e instanceof Error ? e.message : 'Мэдээлэл татаж чадсангүй.'); }
    finally { setLoading(false); }
  }, []);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let active = true;
    apiRequest<Data>('/api/assessments', { cache: 'no-store' })
      .then(rows => { if (active) setData(rows); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Мэдээлэл татаж чадсангүй.'); })
      .finally(() => { if (active) setLoading(false); });
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      apiRequest<Data>('/api/assessments', { cache: 'no-store' })
        .then(rows => { if (active) { setData(rows); setLoading(false); } })
        .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Мэдээлэл шинэчилж чадсангүй.'); });
    };
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const poll = window.setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false; window.clearInterval(timer); window.clearInterval(poll); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement);
    setBusy(true); setError(''); setMessage('');
    try {
      await apiRequest('/api/assessments', { method: 'POST', body: JSON.stringify({ kind, courseId: form.get('courseId'), title, description, dueAt: new Date(String(form.get('dueAt'))).toISOString(), attachment: await readFile(form.get('file') as File) }) });
      setCreating(false); setTitle(''); setDescription(''); setMessage(`${label} нийтлэгдлээ.`); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Нийтэлж чадсангүй.'); }
    finally { setBusy(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>, item: Item) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    setBusy(true); setError(''); setMessage('');
    try {
      const chosenFile = form.get('file') as File;
      let attachment = await readFile(chosenFile);
      if (!attachment && item.submissions[0]?.attachment && !form.get('removeFile')) {
        attachment = await apiRequest<Attachment>(`/api/assessments/${item.id}/file?submission=${item.submissions[0].id}`);
      }
      await apiRequest(`/api/assessments/${item.id}/submission`, { method: 'PUT', body: JSON.stringify({ answer: form.get('answer'), attachment }) });
      setSelected(null); setMessage(`Хариу амжилттай илгээгдлээ. Багш нарын хэсэгт харагдана.`); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Илгээж чадсангүй.'); }
    finally { setBusy(false); }
  }
  async function download(itemId: string, submissionId?: string) {
    setError('');
    try {
      const file = await apiRequest<Attachment>(`/api/assessments/${itemId}/file${submissionId ? `?submission=${submissionId}` : ''}`);
      const bytes = Uint8Array.from(atob(file.data || ''), char => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
      const link = document.createElement('a'); link.href = url; link.download = file.name; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e instanceof Error ? e.message : 'Файл татаж чадсангүй.'); }
  }
  const items = data.items.filter(item => item.kind === kind);
  return <>
    {error && <p className="sg-error" role="alert">{error}</p>}
    {message && <p className="sg-success" role="status">{message}</p>}
    <section className="sg-panel"><div className="sg-panel-toolbar"><div><h2>{label}{teacher ? ' нийтлэх' : ' ба хариу илгээх'}</h2><p>{teacher ? 'Заавар, хугацаа, файл оруулж бүх оюутанд нийтлээрэй.' : 'Нийтэлсэн ажлуудыг үзээд хариу бичих эсвэл файл хавсарган илгээнэ үү.'}</p></div><div className="sg-heading-actions"><button className="sg-button sg-secondary" disabled={loading || busy} onClick={() => void load()}>Шинэчлэх</button>{teacher && <button className="sg-button sg-primary" disabled={busy} onClick={() => setCreating(v => !v)}>{creating ? 'Хаах' : `${label} нэмэх`}</button>}</div></div>
    {teacher && creating && <form className="assessment-form sg-form-fields" onSubmit={create}>
      <div className="sg-form-row"><label>Хичээл<select name="courseId" required><option value="">Хичээл сонгох</option>{data.courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label><label>Илгээх эцсийн хугацаа<input name="dueAt" type="datetime-local" required /></label></div>
      <label>Гарчиг<input required maxLength={160} value={title} onChange={e => setTitle(e.target.value)} /></label>
      <label>Заавар, асуултууд<textarea required maxLength={10000} rows={6} value={description} onChange={e => setDescription(e.target.value)} /></label>
      <label>Материал хавсаргах · 5 MB хүртэл<input type="file" name="file" /></label>
      <div className="sg-heading-actions"><button type="button" className="sg-button sg-secondary" disabled={busy} onClick={() => { setTitle(kind === 'exam' ? 'Явцын шалгалт — Веб технологи' : 'Даалгавар 1 — Танилцуулга веб хуудас'); setDescription(kind === 'exam' ? '1. HTTP GET болон POST хүсэлтийн ялгааг тайлбарла.\n2. HTML form болон CSS ашиглан нэвтрэх хуудас бүтээ.\n3. Код болон тайлбараа PDF эсвэл ZIP файл болгон илгээнэ үү.\nҮнэлгээ: тайлбар 40, хэрэгжүүлэлт 60 оноо.' : 'HTML, CSS ашиглан өөрийн танилцуулга хуудас хийнэ үү.\nШаардлага: нэр, зураг, сонирхол, холбоо барих хэсэгтэй; гар утасны дэлгэцэд тохирсон байх.\nИлгээх: эх кодоо ZIP эсвэл тайлангаа PDF файлаар хавсаргана уу.\nҮнэлгээ: бүтэц 30, загвар 40, тайлбар 30 оноо.'); }}>Жишээ бөглөх</button><button className="sg-button sg-primary" disabled={busy || !data.courses.length}>{busy ? 'Нийтэлж байна…' : 'Нийтлэх'}</button></div>
    </form>}
    {loading ? <p className="sg-loading" role="status">Ачаалж байна…</p> : items.length === 0 ? <EmptyState icon="book" title={`${label} хараахан нийтлээгүй байна`} text={teacher ? 'Нэмэх товчоор нээгээд «Жишээ бөглөх» ашиглаж эхлээрэй.' : 'Багш нийтэлсний дараа энд автоматаар харагдана.'} /> : <div className="assessment-list">{items.map(item => {
      const expired = new Date(item.dueAt).getTime() <= now;
      const own = item.submissions[0];
      const canSubmit = data.courses.find(c => c.id === item.courseId)?.canSubmit;
      return <article className="assessment-card" key={item.id}><div className="sg-panel-toolbar"><div><span className="sg-eyebrow">{data.courses.find(c => c.id === item.courseId)?.title}</span><h3>{item.title}</h3><p>Нийтэлсэн: {item.createdBy}</p><p>Эцсийн хугацаа: {date(item.dueAt)} · {expired ? 'Хугацаа дууссан' : 'Нээлттэй'}</p></div><span className="sg-role-tag">{teacher ? `${item.submissions.length} хариу` : own ? 'Илгээсэн' : 'Илгээгээгүй'}</span></div>
        <p className="assessment-description">{item.description}</p>
        {item.attachment && <button className="sg-button sg-secondary" onClick={() => void download(item.id)}>Материал татах · {item.attachment.name}</button>}
        {teacher ? <details className="assessment-responses" open={item.submissions.length > 0}><summary>Оюутнуудын илгээсэн хариу ({item.submissions.length})</summary>{item.submissions.length ? item.submissions.map(sub => <div className="assessment-submission" key={sub.id}><strong>{sub.studentCode}</strong><small> · {date(sub.updatedAt)}</small><p className="assessment-description">{sub.answer || 'Файл хавсаргасан'}</p>{sub.attachment && <button className="sg-button sg-secondary" onClick={() => void download(item.id, sub.id)}>Хариу татах · {sub.attachment.name}</button>}</div>) : <p>Одоогоор хариу ирээгүй байна.</p>}</details> : <div className="assessment-responses">
          {own && <><p className="sg-success">Илгээсэн: {date(own.updatedAt)}</p><p className="assessment-description">{own.answer}</p>{own.attachment && <button className="sg-button sg-secondary" onClick={() => void download(item.id, own.id)}>{own.attachment.name} татах</button>}</>}
          {!canSubmit && <p className="sg-day-empty">Хичээл сонголт баталгаажихыг хүлээж байна. Баталгаажсаны дараа хариу илгээнэ.</p>}
          {!expired && canSubmit && <button className="sg-button sg-primary" disabled={busy} onClick={() => setSelected(selected?.id === item.id ? null : item)}>{own ? 'Хариу шинэчлэх' : `${label} илгээх`}</button>}
          {selected?.id === item.id && !expired && canSubmit && <form className="sg-form-fields" onSubmit={e => void submit(e, item)}><label>Таны хариу<textarea name="answer" rows={5} maxLength={10000} defaultValue={own?.answer || ''} placeholder="Хариу эсвэл тайлбар бичнэ үү…" /></label><label>Файл upload · 5 MB хүртэл<input type="file" name="file" /></label>{own?.attachment && <label><span>Шинэ файл сонгохгүй бол өмнөх хавсралт хадгалагдана.</span><span><input type="checkbox" name="removeFile" /> Өмнөх хавсралтыг хасах</span></label>}<div className="sg-heading-actions"><button className="sg-button sg-primary" disabled={busy}>{busy ? 'Илгээж байна…' : 'Хариу илгээх'}</button><button type="button" className="sg-button sg-secondary" disabled={busy} onClick={() => setSelected(null)}>Болих</button></div></form>}
        </div>}
      </article>;
    })}</div>}
    </section>
  </>;
}
