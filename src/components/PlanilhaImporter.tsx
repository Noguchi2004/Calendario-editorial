import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { UploadCloud } from 'lucide-react';
import { PostFormInput } from '../types/editorial';

interface PlanilhaImporterProps {
  onImport: (input: PostFormInput) => Promise<void>;
  todayStr: string;
}

export const PlanilhaImporter: React.FC<PlanilhaImporterProps> = ({ onImport, todayStr }) => {
  const [isImporting, setIsImporting] = useState(false);

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames.includes('Conteúdo') ? 'Conteúdo' : workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        let count = 0;
        for (const row of jsonData as any) {
          if (row.empresa && row.conteudo) {
            let dataFormatada = todayStr;
            
            // Tratamento de datas nativas do Excel para YYYY-MM-DD
            if (typeof row.data === 'number') {
              const date = new Date(Math.round((row.data - 25569) * 86400 * 1000));
              dataFormatada = date.toISOString().split('T')[0];
            } else if (typeof row.data === 'string' && row.data.includes('/')) {
               const partes = row.data.split('/');
               if(partes.length === 3) dataFormatada = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
            } else if (row.data) {
               dataFormatada = String(row.data).substring(0, 10);
            }

            await onImport({
              empresa: String(row.empresa || 'Empresa'),
              data: dataFormatada,
              formato: String(row.formato || 'Reels') as any,
              objetivo: String(row.objetivo || 'Sem objetivo'),
              conteudo: String(row.conteudo || ''),
              status: String(row.status || 'Pendente') as any,
              responsavel: String(row.responsavel || 'Pedro'),
              briefing_url: String(row.briefing_url || '')
            });
            count++;
          }
        }
        alert(`Sucesso! ${count} postagens foram importadas diretamente para o Firebase.`);
      } catch (error) {
        console.error(error);
        alert('Erro ao ler a planilha. Verifique se o formato está correto.');
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    }
  });

  return (
    <div {...getRootProps()} className={`w-full p-6 mb-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors text-center ${isDragActive ? 'border-slate-900 bg-slate-50' : 'border-slate-300 hover:border-slate-400 bg-white'}`}>
      <input {...getInputProps()} />
      <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
      {isImporting ? (
        <p className="text-sm font-semibold text-slate-900">A processar a planilha e a enviar para o Firebase... aguarde.</p>
      ) : isDragActive ? (
        <p className="text-sm font-semibold text-slate-900">Pode soltar a planilha aqui...</p>
      ) : (
        <div>
          <p className="text-sm font-semibold text-slate-900">Arraste a sua planilha de Calendário para aqui</p>
          <p className="text-xs text-slate-500 mt-1">ou clique para selecionar o ficheiro Excel (.xlsx)</p>
        </div>
      )}
    </div>
  );
};