import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

/* ─── Constants ─── */
const SPLIT_LIMIT = 1999;
const CHARGE_THRESHOLD = 2000;
const CHARGE_RATE = 0.004;

/* ─── Types ─── */
interface SplitTransaction {
  index: number;
  amount: number;
}

/* ─── Theme hook ─── */
function useTheme() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("upi-split-theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("upi-split-theme", dark ? "dark" : "light");
  }, [dark]);

  return [dark, setDark] as const;
}

/* ─── Icons (minimal strokes) ─── */
function SunIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function CopyIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function DownloadIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ArrowRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function ArrowLeftIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

/* ─── Helpers ─── */
function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function splitAmount(total: number): SplitTransaction[] {
  if (total <= 0) return [];
  if (total < CHARGE_THRESHOLD) return [{ index: 1, amount: total }];

  const txns: SplitTransaction[] = [];
  let remaining = total;
  let idx = 1;

  while (remaining > 0) {
    const chunk = Math.min(SPLIT_LIMIT, remaining);
    txns.push({ index: idx, amount: parseFloat(chunk.toFixed(2)) });
    remaining = parseFloat((remaining - chunk).toFixed(2));
    idx++;
  }

  return txns;
}

/* ─── UPI App brand icons ─── */
function GPayIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84Z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335"/>
    </svg>
  );
}

function PhonePeIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#5F259F"/>
      <path d="M7.5 18V7h4.3c2.4 0 3.9 1.4 3.9 3.5 0 2.1-1.5 3.5-3.9 3.5H10v4H7.5Zm2.5-6.2h1.6c1.1 0 1.7-.6 1.7-1.5s-.6-1.5-1.7-1.5H10v3Z" fill="white"/>
    </svg>
  );
}

function PaytmIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#00B9F5"/>
      <path d="M5 8h3.2c2 0 3.1 1 3.1 2.5S10.2 13 8.2 13H7.3v3H5V8Zm2.3 3.3h.8c.7 0 1-.4 1-1s-.3-1-1-1h-.8v2Z" fill="white"/>
      <path d="M12 13.5V10h-1V8.5h1V7h2v1.5h1.5V10H14v3c0 .5.2.7.7.7h.8V15h-1.3c-1.5 0-2.2-.6-2.2-1.5Z" fill="white"/>
    </svg>
  );
}

function CredIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#1A1A1A"/>
      <path d="M12 4L4 8.5v7L12 20l8-4.5v-7L12 4Z" stroke="white" strokeWidth="1.2" fill="none"/>
      <path d="M12 4v16M4 8.5l8 4 8-4M4 15.5l8-4 8 4" stroke="white" strokeWidth="0.6" opacity="0.5"/>
    </svg>
  );
}

function SuperMoneyIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#00C853"/>
      <path d="M15.5 8.5c-.8-.8-2-.9-3.2-.4-1.1.4-1.8 1-2 1.2-.3.3-.3.3-.5.1-.8-.8-2.1-.9-3-.3-.8.5-1.2 1.5-.8 2.4.3.6.8 1.1 1.5 1.5l4.5 3 4.5-3c.7-.4 1.2-.9 1.5-1.5.4-.9 0-1.9-.8-2.4-.3-.2-.5-.3-.7-.3-.3 0-.7.1-1 .3" fill="white" opacity="0.9"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold" fontFamily="sans-serif">S</text>
    </svg>
  );
}

function UpiGenericIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#3D8B3D"/>
      <path d="M7 6l5 12L17 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <path d="M10 6l5 12" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
    </svg>
  );
}

/* ─── UPI Apps with their deep link schemes ─── */
interface UpiApp {
  id: string;
  name: string;
  scheme: string;
  logo: (props: { className?: string }) => React.JSX.Element;
}

const UPI_APPS: UpiApp[] = [
  { id: "gpay",       name: "Google Pay",  scheme: "tez://upi/pay",       logo: GPayIcon },
  { id: "phonepe",    name: "PhonePe",     scheme: "phonepe://pay",       logo: PhonePeIcon },
  { id: "paytm",      name: "Paytm",       scheme: "paytm://pay",         logo: PaytmIcon },
  { id: "cred",       name: "CRED",        scheme: "credpay://upi/pay",   logo: CredIcon },
  { id: "supermoney", name: "SuperMoney",   scheme: "supermoney://pay",   logo: SuperMoneyIcon },
  { id: "upi",        name: "Any UPI App", scheme: "upi://pay",           logo: UpiGenericIcon },
];

function buildAppUpiUrl(app: UpiApp, upiId: string, amount: number, txnNote: string): string {
  const params = new URLSearchParams({
    pa: upiId,
    am: amount.toFixed(2),
    cu: "INR",
    tn: txnNote,
  });
  return `${app.scheme}?${params.toString()}`;
}

function buildUpiUrl(upiId: string, amount: number, txnNote: string): string {
  const params = new URLSearchParams({
    pa: upiId,
    am: amount.toFixed(2),
    cu: "INR",
    tn: txnNote,
  });
  return `upi://pay?${params.toString()}`;
}

/* ─── App Steps ─── */
type Step = "input" | "qr";

/* ─── Main App ─── */
export default function App() {
  const [dark, setDark] = useTheme();
  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [txnNote, setTxnNote] = useState("Payment");
  const [step, setStep] = useState<Step>("input");
  const [expandedQr, setExpandedQr] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const numericAmount = useMemo(() => {
    const parsed = parseFloat(amount);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [amount]);

  const transactions = useMemo(() => splitAmount(numericAmount), [numericAmount]);

  const chargesWithout = useMemo(() => {
    if (numericAmount >= CHARGE_THRESHOLD) {
      return parseFloat((numericAmount * CHARGE_RATE).toFixed(2));
    }
    return 0;
  }, [numericAmount]);

  const savings = useMemo(() => chargesWithout, [chargesWithout]);

  const isValidUpi = useMemo(() => {
    if (!upiId) return false;
    return /^[\w.-]+@[\w.-]+$/.test(upiId);
  }, [upiId]);

  const canProceed = numericAmount > 0 && isValidUpi;

  const handleProceed = useCallback(() => {
    if (canProceed) setStep("qr");
  }, [canProceed]);

  const handleBack = useCallback(() => {
    setStep("input");
    setExpandedQr(null);
  }, []);

  const handleCopyUpiLink = useCallback(
    async (txn: SplitTransaction) => {
      if (!isValidUpi) return;
      const url = buildUpiUrl(upiId, txn.amount, `${txnNote} (${txn.index}/${transactions.length})`);
      try {
        await navigator.clipboard.writeText(url);
        setCopiedIndex(txn.index);
        setTimeout(() => setCopiedIndex(null), 2000);
      } catch {
        // fallback
      }
    },
    [upiId, txnNote, transactions.length, isValidUpi]
  );

  const handleDownloadQr = useCallback((_txnIndex: number) => {
    const svgEl = document.getElementById(`qr-svg-${_txnIndex}`);
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `upi-payment-${_txnIndex}.png`;
      link.href = pngUrl;
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  }, []);

  // Reset to input step if inputs change
  useEffect(() => {
    setStep("input");
    setExpandedQr(null);
  }, [amount, upiId]);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/90 border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <motion.div
            className="flex items-center gap-2.5"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center">
              <span className="text-background font-bold text-sm">₹</span>
            </div>
            <span className="text-base font-semibold tracking-tight">UPI Split</span>
          </motion.div>

          <motion.button
            id="theme-toggle"
            onClick={() => setDark((d) => !d)}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center transition-colors hover:bg-secondary cursor-pointer"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
          >
            <AnimatePresence mode="wait">
              {dark ? (
                <motion.div key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <SunIcon className="w-4 h-4" />
                </motion.div>
              ) : (
                <motion.div key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <MoonIcon className="w-4 h-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        <AnimatePresence mode="wait">
          {step === "input" ? (
            <motion.div
              key="input-step"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-6"
            >
              {/* Tagline */}
              <motion.div
                className="text-center space-y-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <p className="text-sm text-muted-foreground">
                  UPI merchant payments ≥ <span className="font-medium text-foreground">₹2,000</span> attract{" "}
                  <span className="font-medium text-red-500">0.4% charges</span>.
                  Split into <span className="font-medium text-foreground">₹1,999</span> to pay{" "}
                  <span className="font-medium text-green-600 dark:text-green-400">zero</span>.
                </p>
              </motion.div>

              {/* Input Card */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Card className="border-border">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold">Payment Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="amount" className="text-sm">Amount (₹)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base font-medium">₹</span>
                        <Input
                          id="amount"
                          type="number"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="pl-8 h-12 text-xl font-semibold bg-secondary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="upi-id" className="text-sm">Merchant UPI ID</Label>
                      <Input
                        id="upi-id"
                        type="text"
                        placeholder="merchant@upi"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="h-10 bg-secondary/50"
                      />
                      {upiId && !isValidUpi && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="text-xs text-red-500"
                        >
                          Enter a valid UPI ID (e.g. name@bank)
                        </motion.p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="txn-note" className="text-sm">Note</Label>
                      <Input
                        id="txn-note"
                        type="text"
                        placeholder="Payment"
                        value={txnNote}
                        onChange={(e) => setTxnNote(e.target.value)}
                        className="h-10 bg-secondary/50"
                        maxLength={50}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Summary */}
              <AnimatePresence>
                {numericAmount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Card className="border-border">
                      <CardContent className="pt-5 pb-5 space-y-4">
                        {/* Stats row */}
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div>
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Amount</p>
                            <p className="text-sm font-semibold tabular-nums">{formatCurrency(numericAmount)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Splits</p>
                            <p className="text-sm font-semibold">{transactions.length}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                              {savings > 0 ? "You save" : "Charges"}
                            </p>
                            <p className={`text-sm font-semibold ${savings > 0 ? "text-green-600 dark:text-green-400" : ""}`}>
                              {savings > 0 ? formatCurrency(savings) : "₹0.00"}
                            </p>
                          </div>
                        </div>

                        {savings > 0 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2 p-2.5 rounded-lg bg-green-500/8 border border-green-500/15"
                          >
                            <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                            <p className="text-xs text-green-700 dark:text-green-300">
                              Save <span className="font-semibold">{formatCurrency(savings)}</span> by splitting into {transactions.length} transactions
                            </p>
                          </motion.div>
                        )}

                        {numericAmount > 0 && numericAmount < CHARGE_THRESHOLD && (
                          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary">
                            <CheckIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                            <p className="text-xs text-muted-foreground">
                              Below ₹{CHARGE_THRESHOLD.toLocaleString("en-IN")} — no charges apply
                            </p>
                          </div>
                        )}

                        {chargesWithout > 0 && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Without split:</span>
                            <span className="line-through text-red-400">{formatCurrency(chargesWithout)} charges</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Proceed Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <Button
                  id="proceed-btn"
                  onClick={handleProceed}
                  disabled={!canProceed}
                  className="w-full h-12 text-sm font-medium gap-2 cursor-pointer disabled:cursor-not-allowed"
                  size="lg"
                >
                  <span>Proceed to Generate QR</span>
                  <motion.div
                    animate={{ x: canProceed ? [0, 4, 0] : 0 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  >
                    <ArrowRightIcon className="w-4 h-4" />
                  </motion.div>
                </Button>
                {!canProceed && numericAmount > 0 && !isValidUpi && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Enter a valid UPI ID to continue
                  </p>
                )}
              </motion.div>
            </motion.div>
          ) : (
            /* ─── QR Step ─── */
            <motion.div
              key="qr-step"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-5"
            >
              {/* Back button + header */}
              <div className="flex items-center gap-3">
                <motion.div whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBack}
                    className="gap-1.5 cursor-pointer"
                  >
                    <ArrowLeftIcon className="w-3.5 h-3.5" />
                    Back
                  </Button>
                </motion.div>
                <div className="flex-1">
                  <h2 className="text-base font-semibold">
                    {transactions.length} Transaction{transactions.length > 1 ? "s" : ""}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(numericAmount)} → <span className="font-mono">{upiId}</span>
                  </p>
                </div>
              </div>

              <Separator />

              {/* Transaction QR cards */}
              <div className="space-y-3">
                {transactions.map((txn, i) => (
                  <motion.div
                    key={txn.index}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.3 }}
                  >
                    <QRTransactionCard
                      txn={txn}
                      total={transactions.length}
                      upiId={upiId}
                      txnNote={txnNote}
                      isExpanded={expandedQr === txn.index}
                      isCopied={copiedIndex === txn.index}
                      onToggle={() =>
                        setExpandedQr((prev) => (prev === txn.index ? null : txn.index))
                      }
                      onCopy={() => handleCopyUpiLink(txn)}
                      onDownload={() => handleDownloadQr(txn.index)}
                      dark={dark}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Summary footer */}
              {savings > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: transactions.length * 0.06 + 0.1 }}
                  className="text-center py-3"
                >
                  <p className="text-xs text-muted-foreground">
                    Total saved: <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(savings)}</span>
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-2xl mx-auto px-4 py-5 text-center">
          <p className="text-xs text-muted-foreground">
            Split UPI payments to avoid 0.4% MDR charges
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ─── QR Transaction Card ─── */
interface QRTransactionCardProps {
  txn: SplitTransaction;
  total: number;
  upiId: string;
  txnNote: string;
  isExpanded: boolean;
  isCopied: boolean;
  onToggle: () => void;
  onCopy: () => void;
  onDownload: () => void;
  dark: boolean;
}

function QRTransactionCard({
  txn,
  total,
  upiId,
  txnNote,
  isExpanded,
  isCopied,
  onToggle,
  onCopy,
  onDownload,
  dark,
}: QRTransactionCardProps) {
  const upiUrl = buildUpiUrl(upiId, txn.amount, `${txnNote} (${txn.index}/${total})`);

  return (
    <Card
      className={`border-border transition-all duration-200 ${
        isExpanded ? "ring-1 ring-foreground/10" : ""
      }`}
    >
      {/* Clickable header row */}
      <motion.div
        className="flex items-center justify-between p-4 cursor-pointer select-none"
        onClick={onToggle}
        whileTap={{ scale: 0.995 }}
      >
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-[11px] font-mono tabular-nums px-2 py-0.5">
            {txn.index}/{total}
          </Badge>
          <span className="text-base font-semibold tabular-nums">
            {formatCurrency(txn.amount)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {txn.amount < CHARGE_THRESHOLD && (
            <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
              No fee
            </span>
          )}
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ArrowRightIcon className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        </div>
      </motion.div>

      {/* Expanded QR section */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <Separator />
            <div className="p-4 space-y-4">
              {/* QR Code */}
              <motion.div
                className="flex justify-center"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.25 }}
              >
                <div className="p-4 bg-white rounded-xl border border-neutral-200">
                  <QRCodeSVG
                    id={`qr-svg-${txn.index}`}
                    value={upiUrl}
                    size={200}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#000000"
                    includeMargin={false}
                  />
                </div>
              </motion.div>

              {/* UPI ID */}
              <p className="text-xs text-muted-foreground text-center font-mono break-all">
                {upiId}
              </p>

              {/* Actions */}
              <motion.div
                className="grid grid-cols-2 gap-2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 h-9 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); onCopy(); }}
                >
                  {isCopied ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-3.5 h-3.5" />
                      Copy Link
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 h-9 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); onDownload(); }}
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  Save QR
                </Button>
              </motion.div>

              {/* Pay via UPI Apps */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2.5"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-xs text-muted-foreground font-medium text-center">Pay via</p>
                <div className="grid grid-cols-3 gap-2">
                  {UPI_APPS.map((app) => (
                    <motion.a
                      key={app.id}
                      href={buildAppUpiUrl(app, upiId, txn.amount, `${txnNote} (${txn.index}/${total})`)}
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className={`w-full h-10 text-xs gap-2 font-medium cursor-pointer ${
                          app.id === "upi"
                            ? dark
                              ? "bg-white text-black hover:bg-neutral-200 border-white/20"
                              : "bg-black text-white hover:bg-neutral-800 border-black/20"
                            : ""
                        }`}
                      >
                        <app.logo className="w-5 h-5 shrink-0 rounded" />
                        <span className="truncate">{app.name}</span>
                      </Button>
                    </motion.a>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
