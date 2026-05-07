import React, { useState, useRef, useEffect } from 'react';
import {
  Mic, Square, FileText, User, Activity, ClipboardCheck,
  Layout, Download, Trash2, CheckCircle2, Check, X, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';

const OsteomedicLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={cn("fill-none", className)}>
    <path d="M50 15L15 35V65L50 85L85 65V35L50 15Z" fill="#fff" />
    <path d="M50 35V85L85 65V35L50 15V35Z" fill="#67CADB" />
    <path d="M50 15L85 35L50 55L15 35L50 15Z" fill="#A7E1EB" />
    <path d="M15 35V65L50 85V35L15 35Z" fill="#1389A8" />
    <g stroke="#fff" strokeWidth="1.5" opacity="0.6">
      <line x1="25" y1="45" x2="25" y2="65" />
      <line x1="32" y1="50" x2="32" y2="70" />
      <line x1="40" y1="55" x2="40" y2="75" />
      <circle cx="25" cy="45" r="1.5" fill="#fff" stroke="none" />
      <circle cx="32" cy="70" r="1.5" fill="#fff" stroke="none" />
      <circle cx="40" cy="55" r="1.5" fill="#fff" stroke="none" />
    </g>
    <path d="M58 45L65 52L72 45V65M58 65H72" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export interface AnamnesisResult {
  paciente: { nome: string; identificacao: { idade?: string; sexo?: string; profissao?: string; }; };
  queixaPrincipal: { relato: string; inicio: string; intensidade: string; };
  hda: { inicioMecanismo: string; localizacaoIrradiacao: string; fatoresMelhoraPiora: string; tratamentosPrevios: string; };
  antecedentes: { pessoais: string; familiares: string; medicamentosEmUso: string[]; };
  habitosEstiloVida: string;
  revisaoSistemas: string;
  exameFisico: { sinaisVitais: { pa: string; fc: string; satO2: string; }; avaliacaoSegmentar: string; };
  impressaoDiagnostica: { principal: string; diferenciais: string; };
  condutaMedica: { examesSolicitados: string; prescricao: string; orientacoes: string; };
  evolucaoClinica: string;
}

const Header = ({ credits, onOpenSettings }: { credits: number | null; onOpenSettings: () => void }) => (
  <header className="h-16 border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center">
        <OsteomedicLogo className="w-full h-full" />
      </div>
      <div>
        <h1 className="text-sm font-black tracking-tighter text-white uppercase flex items-center gap-1">
          OSTEOMEDIC <span className="text-osteomedic-secondary font-light">| AI</span>
        </h1>
        <p className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">Anamnese Inteligente</p>
      </div>
    </div>
    <div className="flex items-center gap-4">
      {credits !== null && (
        <div className="px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900 flex items-center gap-2">
          <Activity className="w-3 h-3 text-osteomedic-secondary" />
          <span className="text-[10px] text-zinc-300 font-medium uppercase tracking-wider">Saldo: {credits} Tokens</span>
        </div>
      )}
      <div className="hidden md:flex px-3 py-1 rounded-full border border-zinc-800 bg-zinc-950 items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Sistema Ativo</span>
      </div>
      <button onClick={onOpenSettings} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors">
        <Settings className="w-4 h-4" />
      </button>
    </div>
  </header>
);

const SectionHeader = ({ title, icon: Icon }: { title: string; icon: any }) => (
  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800">
    <Icon className="w-4 h-4 text-osteomedic-secondary" />
    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-[0.2em]">{title}</h3>
  </div>
);

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [anamnesis, setAnamnesis] = useState<AnamnesisResult | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [credits, setCredits] = useState<number | null>(null);
  const [activeLayoutIdx, setActiveLayoutIdx] = useState(0);
  const [layouts, setLayouts] = useState([
    { name: 'Padrão Osteomedic', prompt: 'Você é um assistente médico especialista da Osteomedic. Transcreva e estruture a anamnese distinguindo vozes de Médico e Paciente. Siga o padrão clínico completo.' },
    { name: 'Pediatria Express', prompt: 'Foco em pediatria. Identifique marcos de desenvolvimento, histórico vacinal e queixas dos pais. Use linguagem técnica médica para o prontuário.' },
    { name: 'Avaliação Postural', prompt: 'Foco em ortopedia e postura. Detalhe localização da dor, testes de ADM e achados de inspeção física mencionados.' },
  ]);

  useEffect(() => {
    const saved = localStorage.getItem('osteomed_layouts');
    if (saved) setLayouts(JSON.parse(saved));
    fetch('/api/user/credits?userId=admin')
      .then(r => r.json())
      .then(d => { if (d.credits !== undefined) setCredits(d.credits); })
      .catch(() => setCredits(50));
  }, []);

  const saveSettings = () => {
    localStorage.setItem('osteomed_layouts', JSON.stringify(layouts));
    setShowSettings(false);
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingTime(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const startRecording = async () => {
    setTranscriptionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size < 1000) {
          setTranscriptionError("Gravação muito curta. Grave por pelo menos 5 segundos.");
          setIsProcessing(false);
          return;
        }
        await handleProcessAudio(audioBlob, mimeType);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') setTranscriptionError("Microfone bloqueado. Permita o acesso nas configurações do navegador.");
      else setTranscriptionError(`Erro ao acessar microfone: ${err.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      setIsProcessing(true);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleProcessAudio = async (blob: Blob, mimeType: string) => {
    if (credits !== null && credits <= 0) {
      setTranscriptionError("Créditos esgotados. Entre em contato com o suporte Osteomedic.");
      setIsProcessing(false);
      return;
    }

    const safetyTimeout = setTimeout(() => {
      setIsProcessing(current => {
        if (current) { setTranscriptionError("Processamento demorou demais. Tente novamente."); return false; }
        return current;
      });
    }, 90000);

    try {
      // Converte áudio para base64
      const base64data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const result = reader.result?.toString().split(',')[1];
          if (result) resolve(result);
          else reject(new Error("Falha ao preparar áudio."));
        };
        reader.onerror = () => reject(new Error("Erro ao ler arquivo de áudio."));
      });

      // Chama o servidor (que chama o Gemini com a chave segura)
      const response = await fetch('/api/analyze-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: base64data,
          mimeType,
          prompt: layouts[activeLayoutIdx].prompt
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: `Erro ${response.status}` }));
        throw new Error(err.error || `Erro ${response.status}`);
      }

      const { text: responseText } = await response.json();
      if (!responseText) throw new Error("A IA não retornou conteúdo.");

      let data: any;
      try {
        let jsonStr = responseText.trim();
        if (jsonStr.includes("```json")) jsonStr = jsonStr.split("```json")[1].split("```")[0].trim();
        else if (jsonStr.includes("```")) jsonStr = jsonStr.split("```")[1].split("```")[0].trim();
        data = JSON.parse(jsonStr);
      } catch {
        throw new Error("Erro ao interpretar resposta da IA.");
      }

      const sanitized: AnamnesisResult = {
        paciente: { nome: data.paciente?.nome || patientName || 'Não identificado', identificacao: { idade: data.paciente?.identificacao?.idade || '', sexo: data.paciente?.identificacao?.sexo || '', profissao: data.paciente?.identificacao?.profissao || '' } },
        queixaPrincipal: { relato: data.queixaPrincipal?.relato || '', inicio: data.queixaPrincipal?.inicio || '', intensidade: data.queixaPrincipal?.intensidade || '' },
        hda: { inicioMecanismo: data.hda?.inicioMecanismo || '', localizacaoIrradiacao: data.hda?.localizacaoIrradiacao || '', fatoresMelhoraPiora: data.hda?.fatoresMelhoraPiora || '', tratamentosPrevios: data.hda?.tratamentosPrevios || '' },
        antecedentes: { pessoais: data.antecedentes?.pessoais || '', familiares: data.antecedentes?.familiares || '', medicamentosEmUso: Array.isArray(data.antecedentes?.medicamentosEmUso) ? data.antecedentes.medicamentosEmUso : [] },
        habitosEstiloVida: data.habitosEstiloVida || '',
        revisaoSistemas: data.revisaoSistemas || '',
        exameFisico: { sinaisVitais: { pa: data.exameFisico?.sinaisVitais?.pa || '', fc: data.exameFisico?.sinaisVitais?.fc || '', satO2: data.exameFisico?.sinaisVitais?.satO2 || '' }, avaliacaoSegmentar: data.exameFisico?.avaliacaoSegmentar || '' },
        impressaoDiagnostica: { principal: data.impressaoDiagnostica?.principal || '', diferenciais: data.impressaoDiagnostica?.diferenciais || '' },
        condutaMedica: { examesSolicitados: data.condutaMedica?.examesSolicitados || '', prescricao: data.condutaMedica?.prescricao || '', orientacoes: data.condutaMedica?.orientacoes || '' },
        evolucaoClinica: data.evolucaoClinica || ''
      };

      setAnamnesis(sanitized);
      setTranscriptionError(null);

      // Atualiza créditos
      try {
        const usageRes = await fetch('/api/user/usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: "admin", patientName: sanitized.paciente.nome })
        });
        const usageData = await usageRes.json();
        if (usageData.remainingCredits !== undefined) setCredits(usageData.remainingCredits);
      } catch { /* silencioso */ }

    } catch (err: any) {
      setTranscriptionError(`Falha no processamento: ${err.message}`);
    } finally {
      clearTimeout(safetyTimeout);
      setIsProcessing(false);
    }
  };

  const downloadPDF = async () => {
    if (!anamnesis) return;
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const name = patientName || anamnesis.paciente.nome || 'Paciente';
      const date = new Date().toLocaleDateString('pt-BR');
      doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(19, 137, 168);
      doc.text("OSTEOMEDIC | AI", 20, 25);
      doc.setFontSize(10); doc.setTextColor(120, 120, 120);
      doc.text(`ANAMNESE DIGITAL · GERADO EM ${date}`, 20, 32);
      doc.setFillColor(240, 248, 250); doc.rect(20, 38, 170, 35, 'F');
      doc.setDrawColor(19, 137, 168); doc.setLineWidth(0.8); doc.line(20, 38, 20, 73);
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(0, 0, 0);
      doc.text("PACIENTE:", 25, 48); doc.setFont("helvetica", "normal"); doc.text(name, 50, 48);
      doc.setFont("helvetica", "bold"); doc.text("CONTATO:", 25, 54); doc.setFont("helvetica", "normal"); doc.text(patientPhone || 'Não informado', 50, 54);
      let y = 85;
      const checkPage = (h: number) => { if (y + h > 280) { doc.addPage(); y = 25; } };
      const addSection = (title: string, content: string) => {
        const lines = doc.splitTextToSize(content || 'Não informado', 165);
        checkPage((lines.length * 6) + 15);
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(19, 137, 168);
        doc.text(title.toUpperCase(), 20, y);
        doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.2); doc.line(20, y + 2, 190, y + 2);
        y += 10; doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(60, 60, 60);
        doc.text(lines, 20, y); y += (lines.length * 6) + 8;
      };
      addSection("Queixa Principal", `${anamnesis.queixaPrincipal.relato}\nInício: ${anamnesis.queixaPrincipal.inicio} | EVA: ${anamnesis.queixaPrincipal.intensidade}`);
      addSection("HDA", `${anamnesis.hda.inicioMecanismo}\n${anamnesis.hda.localizacaoIrradiacao}\n${anamnesis.hda.fatoresMelhoraPiora}\n${anamnesis.hda.tratamentosPrevios}`);
      addSection("Antecedentes", `Pessoais: ${anamnesis.antecedentes.pessoais}\nFamiliares: ${anamnesis.antecedentes.familiares}\nMedicamentos: ${anamnesis.antecedentes.medicamentosEmUso.join(', ') || 'Nenhum'}`);
      addSection("Exame Físico", `PA ${anamnesis.exameFisico.sinaisVitais.pa} | FC ${anamnesis.exameFisico.sinaisVitais.fc} | SatO2 ${anamnesis.exameFisico.sinaisVitais.satO2}\n${anamnesis.exameFisico.avaliacaoSegmentar}`);
      addSection("Impressão Diagnóstica", `${anamnesis.impressaoDiagnostica.principal}\n${anamnesis.impressaoDiagnostica.diferenciais}`);
      addSection("Conduta Médica", `Exames: ${anamnesis.condutaMedica.examesSolicitados}\nPrescrição: ${anamnesis.condutaMedica.prescricao}\nOrientações: ${anamnesis.condutaMedica.orientacoes}`);
      addSection("Evolução Clínica", anamnesis.evolucaoClinica);
      doc.setFontSize(8); doc.setTextColor(180, 180, 180);
      doc.text("Gerado via Osteomedic AI — validar com profissional médico.", 20, 285);
      doc.save(`Anamnese_${name.replace(/\s+/g, '_')}.pdf`);
    } catch (err) { alert("Erro ao gerar PDF."); }
  };

  const handleCopyNote = async () => {
    if (!anamnesis) return;
    const note = `--- ANAMNESE OSTEOMEDIC | ${new Date().toLocaleDateString('pt-BR')} ---
PACIENTE: ${patientName || anamnesis.paciente?.nome} | CONTATO: ${patientPhone}
[QUEIXA PRINCIPAL] ${anamnesis.queixaPrincipal?.relato}
[HDA] ${anamnesis.hda?.inicioMecanismo}
[IMPRESSÃO] ${anamnesis.impressaoDiagnostica?.principal}
[CONDUTA] ${anamnesis.condutaMedica?.orientacoes}`.trim();
    try { await navigator.clipboard.writeText(note); setIsCopied(true); setTimeout(() => setIsCopied(false), 3000); }
    catch { alert('Não foi possível copiar.'); }
  };

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <Header credits={credits} onOpenSettings={() => setShowSettings(true)} />

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        <AnimatePresence>
          {showSettings && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl w-full max-w-md shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <Activity className="w-5 h-5 text-blue-500" />
                  <h2 className="text-xl font-bold text-white">Configurações</h2>
                </div>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {layouts.map((layout, idx) => (
                    <div key={idx} className="space-y-2">
                      <p className="text-[10px] text-zinc-400 font-bold">{layout.name}</p>
                      <textarea value={layout.prompt}
                        onChange={e => { const n = [...layouts]; n[idx].prompt = e.target.value; setLayouts(n); }}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-[11px] text-zinc-400 h-20 outline-none focus:border-osteomedic-secondary" />
                    </div>
                  ))}
                </div>
                <div className="pt-6 mt-6 border-t border-zinc-800 flex gap-3">
                  <button onClick={() => setShowSettings(false)} className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-400 text-xs font-bold uppercase">Cancelar</button>
                  <button onClick={saveSettings} className="flex-1 py-3 rounded-xl bg-osteomedic-primary text-white text-xs font-bold uppercase hover:bg-osteomedic-accent transition-colors">Salvar</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Coluna Esquerda */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <SectionHeader title="Identificar Paciente" icon={User} />
            <div className="space-y-4">
              <div>
                <label className="text-[9px] text-zinc-500 uppercase font-black mb-1.5 block tracking-widest">Nome Completo *</label>
                <input type="text" placeholder="Nome do Paciente" value={patientName} onChange={e => setPatientName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-osteomedic-secondary outline-none transition-all placeholder:text-zinc-700" />
              </div>
              <div>
                <label className="text-[9px] text-zinc-500 uppercase font-black mb-1.5 block tracking-widest">Telefone / WhatsApp *</label>
                <input type="text" placeholder="(00) 00000-0000" value={patientPhone} onChange={e => setPatientPhone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-osteomedic-secondary outline-none transition-all placeholder:text-zinc-700" />
              </div>

              <AnimatePresence>
                {transcriptionError && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[11px] leading-relaxed">
                    ⚠️ {transcriptionError}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col items-center justify-center py-10 bg-zinc-950/50 rounded-2xl border-2 border-dashed border-zinc-800 relative overflow-hidden">
                <AnimatePresence>
                  {isRecording && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-blue-500/5 flex items-center justify-center">
                      <div className="w-48 h-48 rounded-full border border-blue-500/20 animate-ping absolute" />
                      <div className="w-32 h-32 rounded-full border border-blue-500/40 animate-ping absolute" style={{ animationDelay: '0.5s' }} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 z-10 border-4",
                  isRecording ? "bg-red-500 border-red-400 animate-pulse shadow-[0_0_40px_rgba(239,68,68,0.6)]"
                    : (!patientName || !patientPhone) ? "bg-zinc-800 border-zinc-700 cursor-not-allowed opacity-50"
                    : "bg-osteomedic-primary border-osteomedic-accent hover:scale-105 cursor-pointer shadow-[0_0_20px_rgba(19,137,168,0.3)]"
                )}
                  onClick={() => {
                    if (!patientName || !patientPhone) { setTranscriptionError("Preencha Nome e Telefone antes de gravar."); return; }
                    isRecording ? stopRecording() : startRecording();
                  }}>
                  {isRecording ? <Square className="w-7 h-7 text-white fill-white" /> : <Mic className="w-8 h-8 text-white fill-white" />}
                </div>

                <div className="mt-6 text-center z-10">
                  <p className="text-2xl font-mono text-white mb-2 tracking-tighter">{formatTime(recordingTime)}</p>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
                    {isRecording ? 'Gravando Consulta...' : (!patientName || !patientPhone) ? 'Preencha os campos para gravar' : 'Clique para Iniciar Gravação'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button disabled={!anamnesis} onClick={() => { setAnamnesis(null); setPatientName(''); setPatientPhone(''); setTranscriptionError(null); }}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors disabled:opacity-50 text-xs font-bold uppercase">
                  <Trash2 className="w-4 h-4" /> Limpar
                </button>
                <button disabled={!anamnesis} onClick={handleCopyNote}
                  className={cn("flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl transition-all disabled:opacity-50 text-xs font-black uppercase tracking-widest shadow-xl",
                    isCopied ? "bg-emerald-500 text-white" : "bg-osteomedic-primary text-white hover:bg-osteomedic-accent")}>
                  {isCopied ? <Check className="w-5 h-5" /> : <ClipboardCheck className="w-4 h-4" />}
                  {isCopied ? 'Copiado!' : 'Copiar Nota'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <SectionHeader title="Layout da Clínica" icon={Layout} />
            <div className="space-y-2">
              {layouts.map((layout, idx) => (
                <div key={idx} onClick={() => setActiveLayoutIdx(idx)}
                  className={cn("p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
                    activeLayoutIdx === idx ? "bg-osteomedic-primary/10 border-osteomedic-secondary/50" : "bg-zinc-950/30 border-zinc-800 hover:border-zinc-700")}>
                  <span className={cn("text-xs font-medium", activeLayoutIdx === idx ? "text-white" : "text-zinc-500")}>{layout.name}</span>
                  <div className={cn("w-2 h-2 rounded-full", activeLayoutIdx === idx ? "bg-osteomedic-secondary" : "bg-zinc-800")} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna Direita */}
        <div className="lg:col-span-8 flex flex-col h-[calc(100vh-10rem)]">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col h-full overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-zinc-800"><FileText className="w-5 h-5 text-zinc-400" /></div>
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-tight">Ficha de Anamnese Estruturada</h2>
                  <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest">Medical Record Generation</p>
                </div>
              </div>
              <button disabled={!anamnesis} onClick={downloadPDF} className="p-2 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors text-zinc-400 disabled:opacity-30">
                <Download className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 font-mono relative">
              <AnimatePresence mode="wait">
                {isRecording ? (
                  <motion.div key="recording" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center gap-6">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                        <Mic className="w-8 h-8 text-red-500 animate-pulse" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-ping" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-lg font-sans font-bold text-white uppercase">Capturando Áudio...</p>
                      <p className="text-xs text-zinc-500 max-w-xs uppercase leading-relaxed">Fale os dados do paciente. A IA irá estruturar tudo ao finalizar.</p>
                    </div>
                  </motion.div>
                ) : isProcessing ? (
                  <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center gap-6">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-2 border-zinc-800" />
                      <div className="w-16 h-16 rounded-full border-t-2 border-blue-500 absolute top-0 left-0 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center"><Activity className="w-6 h-6 text-blue-500 animate-pulse" /></div>
                    </div>
                    <p className="text-lg font-sans font-bold text-white">Processando Anamnese</p>
                  </motion.div>
                ) : transcriptionError ? (
                  <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center gap-6 p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                      <X className="w-8 h-8 text-red-500" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-white">Falha no Processamento</h3>
                      <p className="text-sm text-zinc-400 max-w-md">{transcriptionError}</p>
                    </div>
                    <button onClick={() => { setTranscriptionError(null); setIsProcessing(false); }}
                      className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold uppercase transition-colors">
                      Tentar Novamente
                    </button>
                  </motion.div>
                ) : anamnesis ? (
                  <motion.div key="result" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-10 pb-12">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-2xl bg-zinc-950/50 border border-zinc-800">
                      {[
                        { label: 'Paciente', value: patientName || anamnesis.paciente.nome },
                        { label: 'Contato', value: patientPhone || 'Não informado' },
                        { label: 'Idade / Sexo', value: `${anamnesis.paciente.identificacao?.idade || '—'} • ${anamnesis.paciente.identificacao?.sexo || '—'}` },
                        { label: 'Data', value: new Date().toLocaleDateString('pt-BR') },
                      ].map(({ label, value }) => (
                        <div key={label} className="space-y-1">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{label}</p>
                          <p className="text-sm font-bold font-sans text-white">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-6">
                      {[
                        { title: 'Queixa Principal', content: `${anamnesis.queixaPrincipal.relato}\nInício: ${anamnesis.queixaPrincipal.inicio} | EVA: ${anamnesis.queixaPrincipal.intensidade}` },
                        { title: 'História da Doença Atual', content: `${anamnesis.hda.inicioMecanismo}\n${anamnesis.hda.localizacaoIrradiacao}\n${anamnesis.hda.fatoresMelhoraPiora}\nTratamentos: ${anamnesis.hda.tratamentosPrevios}` },
                        { title: 'Antecedentes', content: `Pessoais: ${anamnesis.antecedentes.pessoais}\nFamiliares: ${anamnesis.antecedentes.familiares}\nMedicamentos: ${anamnesis.antecedentes.medicamentosEmUso.join(', ') || 'Nenhum'}` },
                        { title: 'Exame Físico', content: `PA ${anamnesis.exameFisico.sinaisVitais.pa} | FC ${anamnesis.exameFisico.sinaisVitais.fc} | SatO2 ${anamnesis.exameFisico.sinaisVitais.satO2}\n${anamnesis.exameFisico.avaliacaoSegmentar}` },
                        { title: 'Impressão Diagnóstica', content: `${anamnesis.impressaoDiagnostica.principal}\nDiferenciais: ${anamnesis.impressaoDiagnostica.diferenciais}` },
                        { title: 'Conduta Médica', content: `Exames: ${anamnesis.condutaMedica.examesSolicitados}\nPrescrição: ${anamnesis.condutaMedica.prescricao}\nOrientações: ${anamnesis.condutaMedica.orientacoes}` },
                        { title: 'Evolução Clínica', content: anamnesis.evolucaoClinica },
                      ].map(({ title, content }) => (
                        <div key={title} className="space-y-2">
                          <h3 className="text-xs font-bold text-osteomedic-secondary uppercase tracking-widest border-b border-zinc-800 pb-2">{title}</h3>
                          <div className="text-xs text-zinc-300 leading-relaxed font-sans whitespace-pre-line pl-2">
                            <ReactMarkdown>{content}</ReactMarkdown>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center gap-4 opacity-30 grayscale">
                    <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800"><Mic className="w-16 h-16 text-zinc-600" /></div>
                    <div className="text-center">
                      <p className="text-sm font-bold uppercase tracking-widest">Aguardando Captura de Áudio</p>
                      <p className="text-[10px] uppercase tracking-wider mt-1 italic">Nenhum dado processado no momento</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
