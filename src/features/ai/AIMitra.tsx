import { useState, useRef, useEffect, useMemo } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useBusinessStore } from '../../store/useBusinessStore';
import { formatINR } from '../../utils/financial';
import {
  Bot,
  Send,
  User,
  RotateCcw,
  Copy,
  Check,
  TrendingUp,
  ShieldAlert,
  Coins,
  FileText,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

let messageSeq = 0;
const createMessageId = (prefix: string) => `${prefix}-${Date.now()}-${++messageSeq}`;
const formatCurrentTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function AIMitra() {
  const user = useAuthStore((s) => s.user);
  const { projectCost, selectedScheme, emiResult, operatingCosts } = useFinanceStore();
  const { marketAnalysis } = useBusinessStore();

  const activeScheme = selectedScheme?.scheme;
  const monthlyOperatingTotal = useMemo(
    () => operatingCosts?.reduce((acc, c) => acc + c.amount, 0) || 45000,
    [operatingCosts]
  );

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const initialGreeting = `Namaste ${user?.name || 'Rameshji'}! 🙏 I am Mitra, your personal business advisor. 
I have reviewed your profile for your **${user?.businessInterest || 'dairy'}** venture in **${user?.location.village || 'Changa'}, ${user?.location.district || 'Anand'}**.

Here is what I can help you with:
• Explaining your loan EMI (${formatINR(emiResult?.monthlyEMI || 14032)}/mo) and government subsidies
• Reviewing your ₹${(projectCost?.totalProjectCost || 1000000) / 100000} Lakh project outlay
• Checking competitor density and village demand within 10 KM
• Preparing your bank-ready document checklist

What would you like to explore today?`;

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'ai',
      text: initialGreeting,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const QUICK_PROMPTS = [
    {
      label: 'Explain my loan & EMI',
      icon: <Coins size={14} />,
      prompt: 'Can you explain my loan calculation, EMI, and interest rate in simple words?',
    },
    {
      label: 'Subsidy & Scheme rules',
      icon: <FileText size={14} />,
      prompt: 'Which government scheme is best suited for my capital, and what subsidy is offered?',
    },
    {
      label: 'Key business risks & mitigation',
      icon: <ShieldAlert size={14} />,
      prompt: 'What are the top risks for my business in this village, and how do I prevent losses?',
    },
    {
      label: 'How to reduce operational costs',
      icon: <TrendingUp size={14} />,
      prompt: 'How can I keep my monthly operating expenses under control in the first 6 months?',
    },
  ];

  // Dynamic context-aware response generator
  const generateAIResponse = (userPrompt: string): string => {
    const p = userPrompt.toLowerCase();

    if (p.includes('emi') || p.includes('loan') || p.includes('interest')) {
      return `Here is a clear breakdown of your loan structure:

1. **Total Project Cost:** ${formatINR(projectCost?.totalProjectCost || 1000000)}
2. **Your Own Margin (10%):** ${formatINR(projectCost?.marginCapital || 100000)}
3. **Bank Term Loan (90%):** ${formatINR(projectCost?.loanAmount || 900000)}
4. **Monthly EMI:** **${formatINR(emiResult?.monthlyEMI || 14032)}** per month
5. **Scheme Tenure:** ${activeScheme?.tenureYears || 7} Years (${(activeScheme?.tenureYears || 7) * 12} monthly installments)
6. **Moratorium Period:** You have a **${activeScheme?.moratoriumMonths || 6}-month grace period** where only simple interest is charged before principal installments begin.

💡 *Mitra's Tip:* Deposit your daily sales revenue into your bank current account weekly to build a healthy banking credit score.`;
    }

    if (p.includes('scheme') || p.includes('subsidy') || p.includes('pmegp') || p.includes('mudra')) {
      return `Based on your capital requirement, you are auto-matched with the **${activeScheme?.name || 'Term Loan Scheme'}**:

• **Applicable Channel:** Public Sector Banks / KVIC / NABARD
• **Interest Rate:** Approximately ${activeScheme?.interestRate || 8}% per annum
• **Subsidy Component:** Under PMEGP/NABARD guidelines for rural areas, backward classes/special categories can avail between **25% to 35% margin subsidy** on project cost.
• **Primary Requirements:**
  - Valid Aadhaar & PAN card
  - 8th Standard pass certificate (for manufacturing projects above ₹10L)
  - Detailed Project Report (which you can print directly from our Business Plan tab!)

Shall I help you prepare the document checklist?`;
    }

    if (p.includes('risk') || p.includes('loss') || p.includes('protect')) {
      return `Here are the top operational risks identified for your business in ${user?.location.district || 'Anand'}:

1. **Raw Material / Feed Price Fluctuation:** Animal feed and fodder prices vary seasonally. Keep a 15-day dry fodder reserve.
2. **Cattle Health & Veterinary Care:** Always maintain cattle insurance (covered under subsidized rural schemes) and establish a monthly vet inspection routine.
3. **Perishability / Cold Chain:** Raw milk degrades quickly during hot summer months. Invest in a 500-litre bulk milk chiller as your next equipment upgrade.
4. **Working Capital Delay:** Maintain a cash buffer of at least ${formatINR(monthlyOperatingTotal * 1.5)} for emergency expenses.`;
    }

    if (p.includes('cost') || p.includes('expense') || p.includes('operating')) {
      return `To optimize your monthly operating costs (currently estimated at **${formatINR(monthlyOperatingTotal)}/month**):

• **Direct Procurement:** Purchase cattle feed in bulk (1-tonne batches) directly from wholesale mills or cooperative societies for an 8-12% price discount.
• **Energy Optimization:** If setting up cold storage or chilling units, apply for the state agricultural power tariff subsidy.
• **Local Labor:** Train family members or local village apprentices initially before taking on full-time wage staff.
• **Byproduct Monetization:** Sell organic cow dung compost/vermicompost to neighboring farming families to offset feed costs by ₹3,000–₹5,000/month.`;
    }

    return `Thank you for asking! Regarding your **${user?.businessInterest || 'business'}** venture in **${user?.location.village || 'Changa'}**:

Your current projections show healthy fundamentals:
• Strong consumer base of ~${marketAnalysis?.estimatedConsumerBase.toLocaleString('en-IN') || '12,500'} people in your 10 KM catchment area.
• Sound debt-servicing capability with a projected margin of safety above 35%.
• Access to subsidized finance through ${activeScheme?.name || 'Priority Sector Lending'}.

Would you like me to guide you through the bank application steps, or explain any specific financial terms?`;
  };

  const geminiApiKey = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    const newMsg: ChatMessage = {
      id: createMessageId('usr'),
      sender: 'user',
      text: text.trim(),
      timestamp: formatCurrentTime(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMessage('');
    setIsTyping(true);

    let reply = '';

    if (geminiApiKey) {
      try {
        const promptContext = `You are Mitra, a helpful and respectful AI business advisor for rural and semi-urban Indian micro-entrepreneurs.
Context:
- Entrepreneur: ${user?.name || 'Ramesh Patel'}
- Business: ${user?.businessInterest || 'Dairy & Agriculture'}
- Location: ${user?.location.village || 'Village'}, ${user?.location.district || 'District'}, ${user?.location.state || 'India'}
- Project Cost: ₹${projectCost?.totalProjectCost || 1000000}
- Loan: ₹${projectCost?.loanAmount || 900000}
- Monthly EMI: ₹${emiResult?.monthlyEMI || 14032}

Give a direct, supportive, and practical answer with simple language and actionable steps.
User asks: ${text.trim()}`;

        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptContext }] }],
            }),
            signal: AbortSignal.timeout(10000),
          }
        );

        if (resp.ok) {
          const data = await resp.json();
          reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch {
        // Fallback to offline rule engine on network failure or timeout
      }
    }

    if (!reply) {
      reply = generateAIResponse(text);
    }

    const aiMsg: ChatMessage = {
      id: createMessageId('ai'),
      sender: 'ai',
      text: reply,
      timestamp: formatCurrentTime(),
    };

    setMessages((prev) => [...prev, aiMsg]);
    setIsTyping(false);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReset = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'ai',
        text: initialGreeting,
        timestamp: formatCurrentTime(),
      },
    ]);
  };

  return (
    <div className="page-enter" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: 'var(--space-4) var(--space-6)',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-green), var(--color-primary))',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Bot size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)', margin: 0 }}>
                🤝 Mitra AI — Business Companion
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  background: geminiApiKey ? 'rgba(22, 131, 74, 0.12)' : 'rgba(242, 140, 40, 0.12)',
                  color: geminiApiKey ? 'var(--color-green)' : '#D97706',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 'var(--font-weight-semibold)',
                }}
              >
                {geminiApiKey ? '● Gemini AI Connected' : '● Rural Advisory Engine (Offline Ready)'}
              </span>
            </div>
            <p className="text-xs text-muted" style={{ margin: 0 }}>
              Advising for {user?.businessInterest || 'Dairy'} in {user?.location.village || 'Changa'}, {user?.location.district || 'Anand'}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={handleReset}
          title="Reset conversation"
        >
          <RotateCcw size={15} />
          <span>New Chat</span>
        </button>
      </div>

      {/* Message Stream */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--space-6)',
          background: 'var(--color-bg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              gap: 'var(--space-3)',
              alignItems: 'flex-start',
              alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
            }}
          >
            {msg.sender === 'ai' && (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--color-green)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 4,
                }}
              >
                <Bot size={18} />
              </div>
            )}

            <div
              style={{
                background: msg.sender === 'user' ? 'var(--color-primary)' : 'var(--color-surface)',
                color: msg.sender === 'user' ? 'white' : 'var(--color-text)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-sm)',
                border: msg.sender === 'user' ? 'none' : '1px solid var(--color-border)',
                lineHeight: 1.6,
                position: 'relative',
              }}
            >
              <div style={{ whiteSpace: 'pre-line', fontSize: 'var(--font-size-sm)' }}>
                {msg.text}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 'var(--space-2)',
                  marginTop: 'var(--space-2)',
                  fontSize: '11px',
                  color: msg.sender === 'user' ? 'rgba(255, 255, 255, 0.7)' : 'var(--color-text-muted)',
                }}
              >
                <span>{msg.timestamp}</span>
                {msg.sender === 'ai' && (
                  <button
                    type="button"
                    onClick={() => handleCopy(msg.id, msg.text)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'inherit',
                      padding: 2,
                    }}
                    title="Copy response"
                  >
                    {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                )}
              </div>
            </div>

            {msg.sender === 'user' && (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--color-saffron)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 4,
                }}
              >
                <User size={18} />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-3)',
              alignItems: 'center',
              alignSelf: 'flex-start',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--color-green)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bot size={18} />
            </div>
            <div
              style={{
                background: 'var(--color-surface)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-muted)',
                fontStyle: 'italic',
              }}
            >
              Mitra is thinking and formulating guidance...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div
        style={{
          background: 'var(--color-surface)',
          padding: 'var(--space-2) var(--space-6)',
          borderTop: '1px solid var(--color-border)',
          overflowX: 'auto',
          display: 'flex',
          gap: 'var(--space-2)',
          whiteSpace: 'nowrap',
        }}
      >
        {QUICK_PROMPTS.map((qp, idx) => (
          <button
            key={idx}
            type="button"
            className="btn btn--ghost btn--sm"
            style={{
              fontSize: '12px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
            }}
            onClick={() => handleSend(qp.prompt)}
          >
            {qp.icon}
            <span>{qp.label}</span>
          </button>
        ))}
      </div>

      {/* Message Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{
          background: 'var(--color-surface)',
          padding: 'var(--space-4) var(--space-6)',
          borderTop: '1px solid var(--color-border)',
          borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
          display: 'flex',
          gap: 'var(--space-3)',
        }}
      >
        <input
          type="text"
          className="form-input"
          style={{ flex: 1 }}
          placeholder="Ask Mitra about your business, funding, pricing, or rules..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
        />
        <button
          type="submit"
          className="btn btn--primary"
          disabled={!inputMessage.trim() || isTyping}
        >
          <Send size={16} />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
