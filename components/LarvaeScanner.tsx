import React, { useState, useRef, useEffect } from 'react';

interface Prediction {
    x: number;
    y: number;
    width: number;
    height: number;
    class: string;
    confidence: number;
}

const LarvaeScanner: React.FC = () => {
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [predictions, setPredictions] = useState<Prediction[] | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
                setPredictions(null);
                setError(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const drawPredictions = () => {
        if (!canvasRef.current || !imageRef.current || !predictions) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = imageRef.current;

        if (!ctx) return;

        // Set canvas dimensions to match the image display size
        canvas.width = img.width;
        canvas.height = img.height;

        // Calculate scaling factors if the displayed image is scaled
        // The natural width/height vs the displayed width/height
        const scaleX = img.width / img.naturalWidth;
        const scaleY = img.height / img.naturalHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height); // clear just in case
        
        predictions.forEach(p => {
            const boxWidth = p.width * scaleX;
            const boxHeight = p.height * scaleY;
            const boxX = (p.x * scaleX) - (boxWidth / 2); // roboflow typical response is center x, center y
            const boxY = (p.y * scaleY) - (boxHeight / 2);

            ctx.strokeStyle = '#10b981'; // emerald-500
            ctx.lineWidth = 3;
            ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

            // Draw label background
            const label = `${p.class} ${(p.confidence * 100).toFixed(1)}%`;
            ctx.fillStyle = '#10b981';
            ctx.font = '14px Arial';
            const textWidth = ctx.measureText(label).width;
            ctx.fillRect(boxX, boxY > 20 ? boxY - 20 : boxY, textWidth + 10, 20);

            // Draw text
            ctx.fillStyle = '#020617'; // very dark background
            ctx.fillText(label, boxX + 5, boxY > 20 ? boxY - 5 : boxY + 15);
        });
    };

    useEffect(() => {
        if (predictions && imagePreview) {
            const img = new Image();
            img.src = imagePreview;
            img.onload = () => {
                imageRef.current = img;
                drawPredictions();
            };
        }
    }, [predictions]);


    const handleScan = async () => {
        if (!imagePreview) return;
        setIsScanning(true);
        setError(null);

        try {
            const apiKey = localStorage.getItem('roboflow_api_key');
            const endpointConfig = localStorage.getItem('roboflow_model') || 'aegypti-larvae-detection/1';
            
            if (!apiKey) {
                throw new Error("Sila tetapkan API Key Roboflow di ruang Tetapan.");
            }

            const base64Data = imagePreview.split(',')[1];

            const response = await fetch(`https://detect.roboflow.com/${endpointConfig}?api_key=${apiKey}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: base64Data
            });

            if (!response.ok) {
                throw new Error(`Roboflow API error: ${response.status} ${response.statusText}`);
            }

            const responseData = await response.json();
            
            if (responseData.predictions) {
                setPredictions(responseData.predictions);
            } else {
                throw new Error("Format respon tidak sah dari pelayan Roboflow.");
            }
        } catch (err: any) {
            setError(err.message || 'Ralat semasa membuat imbasan.');
        } finally {
            setIsScanning(false);
        }
    };

    return (
        <div className="w-full flex justify-center py-6">
            <div className="max-w-4xl w-full bg-slate-900/80 border border-slate-700/50 rounded-xl p-6 backdrop-blur shadow-2xl">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-sci-fi text-cyan-400 uppercase tracking-widest mb-1 shadow-cyan-500/20 drop-shadow-lg">Aedes Larvae Scanner</h2>
                        <p className="text-sm text-slate-400 font-mono-sci">Powered by Universal Roboflow Inference API</p>
                    </div>
                    {(predictions && predictions.length > 0) && (
                        <div className="px-4 py-2 bg-emerald-900/30 border border-emerald-500/50 rounded-lg text-emerald-400 font-mono-sci tabular-nums text-sm">
                            DETECTED: <span className="text-white text-lg font-bold">{predictions.length}</span>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded text-red-300 font-mono text-sm max-w-2xl">
                        ⚠️ ralat: {error}
                    </div>
                )}

                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                        <div className="relative border-2 border-dashed border-slate-600 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-colors bg-slate-950/50 min-h-[300px] flex items-center justify-center group cursor-pointer">
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleImageUpload} 
                                className="absolute inset-0 opacity-0 cursor-pointer z-20"
                            />
                            {!imagePreview ? (
                                <div className="text-center p-6 disabled-group-hover">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-16 h-16 mx-auto text-slate-500 mb-3 group-hover:text-cyan-400 transition-colors">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                    </svg>
                                    <p className="text-sm text-slate-300 font-bold mb-1">Klik atau heret gambar jentik-jentik</p>
                                    <p className="text-xs text-slate-500 font-mono">Format disokong: JPG, PNG</p>
                                </div>
                            ) : (
                                <div className="relative w-full h-full min-h-[400px] flex items-center justify-center pointer-events-none p-2">
                                    <img 
                                        src={imagePreview} 
                                        alt="Preview" 
                                        className="max-w-full max-h-[60vh] object-contain rounded drop-shadow-2xl"
                                        ref={imageRef}
                                        onLoad={drawPredictions} // just in case it reloads
                                    />
                                    <canvas 
                                        ref={canvasRef} 
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" // Match the position with the image, but since scale calculations rely on DOM size, it's safer to position canvas exactly over the img tag bounds. 
                                        style={{
                                            width: imageRef.current ? imageRef.current.clientWidth : '100%',
                                            height: imageRef.current ? imageRef.current.clientHeight : '100%',
                                            objectFit: 'contain'
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex justify-center md:justify-start">
                            <button 
                                onClick={handleScan}
                                disabled={!imagePreview || isScanning}
                                className={`px-6 py-3 rounded-lg font-bold font-sci-fi tracking-widest transition-all shadow-lg flex items-center gap-2 ${!imagePreview || isScanning ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-900/50 hover:shadow-cyan-500/50'}`}
                            >
                                {isScanning ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Sistem Sedang Mengimbas...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                                        </svg>
                                        JALANKAN IMBASAN
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LarvaeScanner;
