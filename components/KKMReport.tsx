import React from 'react';
import { AnalysisResponse, KKMSectionResult } from '../types';

interface KKMReportProps {
  result: AnalysisResponse;
}

const KKMReport: React.FC<KKMReportProps> = ({ result }) => {
  if (!result.kkmReport) return <div className="p-4 text-center text-red-400">Data Laporan KKM tidak ditemui.</div>;

  const { grade, totalScore, totalDemerit, sections, summary, recommendation } = result.kkmReport;

  return (
    <div className="bg-white text-black rounded-lg overflow-hidden shadow-2xl animate-fade-in print:shadow-none font-sans max-w-4xl mx-auto border-2 border-black">
      {/* Header Borang KKM style - High Contrast */}
      <div className="border-b-4 border-black p-4 md:p-6 bg-gray-100">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div>
                <h2 className="text-xl md:text-2xl font-extrabold uppercase tracking-wide text-black">Laporan Pemeriksaan Premis</h2>
                <p className="text-sm font-bold text-black">FORMAT KKM / PBT (K-PPKM-01/03)</p>
                <p className="text-xs text-black mt-1 font-mono">Dijana oleh: VectorGuard AI (Simulasi)</p>
             </div>
             
             {/* Score Card */}
             <div className="flex gap-4">
                <div className="text-center border-2 border-black p-2 md:p-3 bg-white min-w-[90px] shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                    <div className="text-[10px] font-bold uppercase mb-1 text-black tracking-wider">MARKAH</div>
                    <div className="text-3xl md:text-4xl font-black text-black">{totalScore}</div>
                </div>
                <div className={`text-center border-2 p-2 md:p-3 bg-white min-w-[90px] shadow-[4px_4px_0px_rgba(0,0,0,1)] ${grade === 'TUTUP' || grade === 'D' ? 'border-black text-red-600' : 'border-black text-black'}`}>
                    <div className="text-[10px] font-bold uppercase mb-1 text-black tracking-wider">GRED</div>
                    <div className="text-3xl md:text-4xl font-black">{grade}</div>
                </div>
             </div>
         </div>
      </div>

      {/* Main Content Table */}
      <div className="p-4 md:p-6 bg-white">
          {/* Ulasan Eksekutif - High Contrast Box */}
          <div className="mb-6 bg-white p-4 border-2 border-black rounded shadow-md">
             <h3 className="font-black text-sm uppercase mb-2 text-black border-b-2 border-black pb-1 inline-block">ULASAN HASIL PEMERIKSAAN (PPKP):</h3>
             <p className="text-sm text-black font-bold leading-relaxed italic mt-2">"{summary}"</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse border-2 border-black">
                <thead className="bg-black text-white">
                    <tr>
                        <th className="border border-white p-2 text-left w-12">KOD</th>
                        <th className="border border-white p-2 text-left">PERKARA / ELEMEN PENILAIAN</th>
                        <th className="border border-white p-2 text-center w-20">PEMBERAT</th>
                        <th className="border border-white p-2 text-center w-20">DEMERIT</th>
                    </tr>
                </thead>
                <tbody>
                    {sections.map((sec, idx) => (
                        <tr key={idx} className={`border-b border-black ${sec.demeritReceived > 0 ? 'bg-red-50' : 'bg-white'}`}>
                            <td className="border-r border-black p-2 text-center font-bold text-black">{sec.code}</td>
                            <td className="border-r border-black p-2">
                                <div className="font-bold text-black uppercase text-xs">{sec.title}</div>
                                {sec.demeritReceived > 0 && (
                                    <div className="mt-1">
                                       <span className="text-[10px] font-bold bg-red-600 text-white px-1 py-0.5 rounded">KESALAHAN DITEMUI:</span>
                                       <ul className="list-disc list-inside mt-1 text-black font-bold text-xs pl-2">
                                           {sec.violations.map((v, vIdx) => <li key={vIdx}>{v}</li>)}
                                       </ul>
                                    </div>
                                )}
                            </td>
                            <td className="border-r border-black p-2 text-center font-bold text-gray-500">{sec.totalPoints}</td>
                            <td className={`p-2 text-center font-black text-lg ${sec.demeritReceived > 0 ? 'text-red-600 bg-red-100' : 'text-gray-300'}`}>
                                {sec.demeritReceived > 0 ? `-${sec.demeritReceived}` : '0'}
                            </td>
                        </tr>
                    ))}
                    {/* Summary Row */}
                    <tr className="bg-black text-white font-bold border-t-4 border-black">
                        <td colSpan={3} className="p-3 text-right uppercase tracking-wider text-xs">JUMLAH MARKAH DEMERIT DIPOTONG</td>
                        <td className="p-3 text-center text-xl bg-gray-800 text-white">-{totalDemerit}</td>
                    </tr>
                </tbody>
            </table>
          </div>

          <div className={`mt-6 p-4 border-4 rounded text-center font-bold uppercase shadow-lg ${grade === 'TUTUP' || grade === 'D' || grade === 'F' ? 'border-red-600 bg-red-50 text-red-900' : 'border-black bg-gray-50 text-black'}`}>
              <div className="text-xs mb-1 font-black tracking-widest text-gray-600">STATUS PREMIS:</div>
              <div className="text-lg md:text-2xl font-black tracking-widest">{recommendation}</div>
          </div>
      </div>
    </div>
  );
};

export default KKMReport;