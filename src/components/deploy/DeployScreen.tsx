import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Rocket,
  Server,
  Smartphone,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  HardDrive,
  Terminal,
  Cloud,
} from 'lucide-react';

export const DeployScreen: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const devAppUrl = 'https://ais-dev-vtjt7sxwaozuh3lj7sxbf6-968382935186.asia-southeast1.run.app';
  const sharedAppUrl = 'https://ais-pre-vtjt7sxwaozuh3lj7sxbf6-968382935186.asia-southeast1.run.app';

  // Active URL currently viewed
  const currentActiveUrl =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : devAppUrl;

  useEffect(() => {
    if (qrCanvasRef.current && currentActiveUrl) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        currentActiveUrl,
        {
          width: 140,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        err => {
          if (err) console.error(err);
        }
      );
    }
  }, [currentActiveUrl]);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const commands = [
    {
      title: 'Step 1. Install the Firebase CLI and select your project',
      cmd: `npm install -g firebase-tools\nfirebase login\nfirebase use --add`,
    },
    {
      title: 'Step 2. Deploy Firestore security rules (role checks for owner / cashier)',
      cmd: `firebase deploy --only firestore:rules,firestore:indexes`,
    },
    {
      title: 'Step 3. Build and publish the app on Firebase Hosting (free HTTPS)',
      cmd: `cp .env.example .env.local   # fill in VITE_FIREBASE_* values first\nnpm run build\nfirebase deploy --only hosting`,
    },
    {
      title: 'Step 4. Daily backup: download the JSON backup from Settings, or schedule managed exports (Blaze plan)',
      cmd: `gcloud firestore export gs://YOUR_BACKUP_BUCKET/$(date +%F)`,
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Rocket className="w-5 h-5 text-blue-600" />
            <span>Deployment & Shop Go-Live Center</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Access the live production instance or deploy to your own private VPS (Section 7 & 8)
          </p>
        </div>
      </div>

      {/* Primary Card: Live Instant Deployment (Cloud Run) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-700">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold tracking-wide uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live & Ready for Billing
            </div>
            <h3 className="text-xl font-extrabold tracking-tight">
              Live Cloud Counter Access
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              Your Dairy Parlour Management System is actively running. You can open and use it immediately using the live access link below or scan the QR code with your shop mobile phone.
            </p>

            {/* Active URL */}
            <div className="pt-2 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-700 rounded-lg px-3 py-2 font-mono text-xs text-emerald-400">
                  <span className="truncate max-w-[280px] sm:max-w-md">{devAppUrl}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(devAppUrl, 98)}
                    className="text-slate-400 hover:text-white p-1"
                    title="Copy Active URL"
                  >
                    {copiedIndex === 98 ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <a
                  href={devAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <span>Open Live App</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Shared / Publish info notice */}
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs text-slate-300 space-y-1">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-[11px] uppercase tracking-wider">
                  <span>How to activate the permanent Shared URL:</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  The shared URL (<code className="text-amber-200 font-mono text-[10px]">{sharedAppUrl}</code>) is provisioned once you click the <strong>"Share"</strong> or <strong>"Deploy"</strong> button at the top right of the Google AI Studio screen.
                </p>
              </div>
            </div>
          </div>

          {/* QR Code for Shop Mobile / Tablet */}
          <div className="bg-white p-3 rounded-xl shadow-lg flex flex-col items-center justify-center shrink-0 self-center">
            <canvas ref={qrCanvasRef} />
            <span className="text-[10px] font-bold text-slate-700 mt-1 flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-slate-500" />
              <span>Scan to Open on Counter Phone</span>
            </span>
          </div>
        </div>
      </div>

      {/* Option 2: Firebase (replaces the VPS + FastAPI + PostgreSQL setup) */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-slate-700" />
              <span>Option 2: Firebase Hosting + Firestore (₹0 on the free Spark plan)</span>
            </h3>
            <p className="text-xs text-slate-500">
              No server or backend APIs to run: data lives in Firestore, logins in Firebase Auth, and security rules enforce owner / cashier permissions
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-bold text-slate-900 block">Firestore</span>
            <span className="text-emerald-700 font-extrabold text-sm block mt-0.5">50k reads / 20k writes per day free</span>
            <p className="text-[11px] text-slate-500 mt-1">
              Live sync across counter devices, offline cache when the internet drops.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-bold text-slate-900 block">Firebase Auth</span>
            <span className="text-emerald-700 font-extrabold text-sm block mt-0.5">Free</span>
            <p className="text-[11px] text-slate-500 mt-1">
              Mobile number + PIN login for owner and cashiers, with brute-force rate limiting.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-bold text-slate-900 block">Firebase Hosting</span>
            <span className="text-emerald-700 font-extrabold text-sm block mt-0.5">10 GB storage free</span>
            <p className="text-[11px] text-slate-500 mt-1">
              Automatic HTTPS and CDN; a custom domain can be added any time.
            </p>
          </div>
        </div>

        {/* Step-by-Step Copyable Commands */}
        <div className="space-y-4 pt-2">
          {commands.map((c, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">{c.title}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(c.cmd, idx)}
                  className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                >
                  {copiedIndex === idx ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedIndex === idx ? 'Copied' : 'Copy Commands'}</span>
                </button>
              </div>

              <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {c.cmd}
              </pre>
            </div>
          ))}
        </div>
      </div>

      {/* Backup and Restore Testing */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-3">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <HardDrive className="w-4 h-4 text-emerald-600" />
          <span>Pre-Configured Deployment Files in Repository</span>
        </h4>
        <p className="text-xs text-slate-600">
          All necessary production configuration files have been created in this repository:
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
          <li className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-mono text-emerald-700 font-bold">/Dockerfile</span>
            <span className="text-[11px] text-slate-500">— Multi-stage Node 22 + Caddy runtime</span>
          </li>
          <li className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-mono text-emerald-700 font-bold">/docker-compose.prod.yml</span>
            <span className="text-[11px] text-slate-500">— One-command container launcher</span>
          </li>
          <li className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-mono text-emerald-700 font-bold">/deploy/Caddyfile</span>
            <span className="text-[11px] text-slate-500">— Automatic Let's Encrypt SSL/HTTPS</span>
          </li>
          <li className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-mono text-emerald-700 font-bold">/deploy/backup.sh</span>
            <span className="text-[11px] text-slate-500">— Automated daily rclone sync to R2</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
