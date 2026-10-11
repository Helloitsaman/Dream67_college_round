import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  ShieldAlert, 
  FileText, 
  User, 
  Terminal, 
  CheckCircle, 
  XCircle,
  Activity,
  Server,
  Coins
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { ExecutionEvent, TestCase, TestRun } from '../types';

interface LiveFlowPageProps {
  selectedRun?: TestRun | null;
  traces?: Array<{ test_case: TestCase; events: ExecutionEvent[] }>;
  defaultModel?: string;
}

const fallbackMetrics = [
  { name: 'BN-SUM-01', time: 0.15, tokens: 340, prompt: 255, completion: 85 },
  { name: 'PI-INDIRECT-01', time: 0.34, tokens: 610, prompt: 440, completion: 170 },
  { name: 'TM-DELETE-01', time: 0.26, tokens: 520, prompt: 380, completion: 140 },
  { name: 'DL-PRIV-01', time: 0.34, tokens: 680, prompt: 490, completion: 190 },
  { name: 'MP-CROSS-01', time: 0.31, tokens: 590, prompt: 430, completion: 160 },
];

const executionSteps = [
  { id: 'user_request', label: 'User Request', icon: User, type: 'trigger', detail: 'Task prompt initialized', tokens: 48 },
  { id: 'document_retrieved', label: 'Document Retrieved', icon: FileText, type: 'action', detail: 'Seed Canary Token & Context', tokens: 260 },
  { id: 'agent_reasoning', label: 'OpenRouter LLM', icon: BrainCircuit, type: 'llm', detail: 'Model reasoning & tool selection', tokens: 185 },
  { id: 'policy_guard', label: 'Sandbox Policy Guard', icon: ShieldAlert, type: 'decision', detail: '6-control boundary inspection', tokens: 0 },
  { id: 'tool_attempt', label: 'send_email_mock', icon: Terminal, type: 'action', detail: 'Tool execution boundary check', tokens: 65 },
  { id: 'evaluation', label: 'Deterministic Oracle', icon: Server, type: 'final', detail: 'Canary & state verification', tokens: 0 }
];

export default function LiveAgentFlow({
  selectedRun = null,
  traces = [],
  defaultModel = 'google/gemini-2.5-flash-lite',
}: LiveFlowPageProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [runOutcome, setRunOutcome] = useState<'pending' | 'blocked' | 'exploited'>('pending');

  // Derive chart data & token totals from real selectedRun/traces when available
  const chartData = traces.length > 0
    ? traces.map(({ test_case }) => {
        const pTok = test_case.token_usage?.prompt_tokens ?? 380;
        const cTok = test_case.token_usage?.completion_tokens ?? 140;
        const tTok = test_case.token_usage?.total_tokens ?? (pTok + cTok);
        return {
          name: test_case.scenario_code,
          time: Number(((test_case.duration_ms || 260) / 1000).toFixed(2)),
          tokens: tTok,
          prompt: pTok,
          completion: cTok,
        };
      })
    : fallbackMetrics;

  const totalTokensRequired =
    selectedRun?.metrics_summary?.token_usage?.total_tokens ??
    chartData.reduce((acc, item) => acc + item.tokens, 0);
  const totalPromptTokens =
    selectedRun?.metrics_summary?.token_usage?.prompt_tokens ??
    chartData.reduce((acc, item) => acc + item.prompt, 0);
  const totalCompletionTokens =
    selectedRun?.metrics_summary?.token_usage?.completion_tokens ??
    chartData.reduce((acc, item) => acc + item.completion, 0);

  const testedModelName = selectedRun?.agent_name || defaultModel;
  const execMode = selectedRun?.configuration?.execution_mode || 'hybrid_llm';
  const policySnapshot = selectedRun?.configuration?.policy_snapshot;
  const activeControlsCount = policySnapshot
    ? [
        policySnapshot.untrusted_content_delimiter,
        policySnapshot.enforce_tool_rbac,
        policySnapshot.least_privilege_records,
        policySnapshot.isolate_session_memory,
        policySnapshot.require_human_approval,
        policySnapshot.enforce_call_budget_and_trust,
      ].filter(Boolean).length
    : 6;

  // Simulate the live flow progression
  useEffect(() => {
    if (!isRunning) return;
    
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      if (current >= executionSteps.length) {
        clearInterval(interval);
        const isExploited = (selectedRun?.metrics_summary?.attack_success_rate ?? 0) > 0;
        setRunOutcome(isExploited ? 'exploited' : 'blocked');
        setIsRunning(false);
      } else {
        setActiveStep(current);
      }
    }, 900);

    return () => clearInterval(interval);
  }, [isRunning, selectedRun]);

  const startSimulation = () => {
    setRunOutcome('pending');
    setActiveStep(0);
    setIsRunning(true);
  };

  const getBorderColor = (index: number) => {
    if (activeStep === index && isRunning) return 'border-[#FFD444] shadow-[0_0_15px_rgba(255,212,68,0.2)]';
    if (activeStep > index || (!isRunning && activeStep === executionSteps.length - 1)) return 'border-[#FFD444]/50';
    return 'border-[#222226]';
  };

  const getIconColor = (index: number) => {
    if (activeStep === index && isRunning) return 'text-[#FFD444] animate-pulse';
    if (activeStep > index || (!isRunning && activeStep === executionSteps.length - 1)) return 'text-[#FFD444]';
    return 'text-[#A1A1AA]';
  };

  return (
    <div className="min-h-screen bg-[#070707] text-[#FFFFFF] font-sans p-2 sm:p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left Column: Live Flow Visualization */}
      <div className="lg:col-span-2 flex flex-col space-y-6">
        <div className="flex flex-wrap justify-between items-end gap-4 border-b border-[#222226] pb-4">
          <div>
            <span className="font-cursive-italic text-lg text-[#FFD444]">
              Real-time LLM interaction, token metering & sandbox interception
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif-display text-[#FFFFFF] mt-0.5">
              Agent Execution Trace — {testedModelName}
            </h1>
          </div>
          <button 
            onClick={startSimulation}
            disabled={isRunning}
            className="px-4 py-2.5 bg-[#0D0D0F] border border-[#FFD444] text-[#FFD444] rounded-xl hover:bg-[#FFD444] hover:text-[#070707] transition-colors disabled:opacity-50 font-mono text-xs uppercase tracking-wider"
          >
            {isRunning ? 'Executing Sequence...' : 'Simulate Live Flow'}
          </button>
        </div>

        {/* Visual n8n style Canvas */}
        <div className="bg-[#0D0D0F] border border-[#222226] rounded-xl p-6 sm:p-8 relative overflow-hidden min-h-[500px]">
          {/* Animated Background Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#222226_1px,transparent_1px),linear-gradient(to_bottom,#222226_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none" />

          <div className="relative z-10 flex flex-col space-y-6 max-w-2xl mx-auto">
            {executionSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = activeStep === index && isRunning;
              const isPast = activeStep > index || (!isRunning && activeStep === executionSteps.length - 1);
              
              return (
                <div key={step.id} className="relative flex flex-col items-center">
                  {/* Vertical Connection Branch */}
                  {index !== 0 && (
                    <div className="h-6 w-[2px] bg-gradient-to-b from-[#222226] to-[#222226] relative">
                      {isPast && (
                        <div className="absolute inset-0 bg-[#FFD444] origin-top animate-[scaleY_0.5s_ease-out_forwards]" />
                      )}
                    </div>
                  )}

                  {/* Node Card */}
                  <div className={`w-full max-w-lg bg-[#161618] border-2 rounded-xl p-4 flex items-center transition-all duration-300 ${getBorderColor(index)}`}>
                    <div className={`p-3 bg-[#070707] rounded-lg border border-[#222226] mr-4 ${getIconColor(index)}`}>
                      <Icon size={22} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-[#FFFFFF] font-medium text-base truncate">{step.label}</h3>
                        {step.tokens > 0 && (
                          <span className="px-2 py-0.5 rounded bg-[#0D0D0F] border border-[#2B2B32] text-[11px] font-mono text-[#FFD444] shrink-0">
                            {step.tokens} tokens
                          </span>
                        )}
                      </div>
                      <p className="text-[#A1A1AA] text-xs font-mono mt-1 truncate">
                        {step.detail || `Event: ${step.id}`}
                      </p>
                    </div>

                    {/* Status Indicator */}
                    <div className="ml-4 flex items-center justify-center">
                      {isActive && <Activity size={20} className="text-[#FFD444] animate-bounce" />}
                      {isPast && index !== executionSteps.length - 1 && <CheckCircle size={20} className="text-[#FFD444]" />}
                      {isPast && index === executionSteps.length - 1 && (
                         runOutcome === 'blocked' 
                          ? <XCircle size={24} className="text-green-500" />
                          : <ShieldAlert size={24} className="text-[#FFD444]" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Metrics & Token Evaluation Context */}
      <div className="flex flex-col space-y-6">
        
        {/* Run & Token Telemetry Panel */}
        <div className="bg-[#0D0D0F] border border-[#222226] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4 border-b border-[#222226] pb-3">
            <h2 className="font-serif-display text-xl text-[#FFFFFF]">Model & Token Telemetry</h2>
            <Coins className="w-4 h-4 text-[#FFD444]" />
          </div>
          <div className="space-y-3.5 font-mono text-xs">
            <div className="flex justify-between items-center">
              <span className="text-[#A1A1AA]">Target Model</span>
              <span className="text-[#FFD444] truncate max-w-[180px]">{testedModelName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#A1A1AA]">Execution Mode</span>
              <span className="text-[#FFFFFF]">{execMode}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#A1A1AA]">Active Controls</span>
              <span className="text-[#FFFFFF]">{activeControlsCount} / 6</span>
            </div>
            <div className="pt-2 border-t border-[#1F1F23] flex justify-between items-center">
              <span className="text-[#A1A1AA]">Total Tokens Required</span>
              <span className="text-[#FFD444] font-semibold text-sm">
                {totalTokensRequired.toLocaleString()} tok
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#A1A1AA]">Prompt / Context Tokens</span>
              <span className="text-[#FFFFFF]">{totalPromptTokens.toLocaleString()} tok</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#A1A1AA]">Model Completion Tokens</span>
              <span className="text-[#FFFFFF]">{totalCompletionTokens.toLocaleString()} tok</span>
            </div>
            <div className="pt-2 border-t border-[#1F1F23] flex justify-between items-center">
              <span className="text-[#A1A1AA]">Attack Success Rate</span>
              <span className={runOutcome === 'blocked' ? 'text-green-400' : 'text-[#FFD444]'}>
                {selectedRun
                  ? `${selectedRun.metrics_summary?.attack_success_rate ?? 0}%`
                  : runOutcome === 'pending'
                  ? '--'
                  : '0.0%'}
              </span>
            </div>
          </div>
        </div>

        {/* Execution Latency Graph */}
        <div className="bg-[#0D0D0F] border border-[#222226] rounded-xl p-6 flex-1 min-h-[260px]">
          <h2 className="font-serif-display text-lg text-[#FFFFFF] mb-4">Execution Latency (s)</h2>
          <div className="h-[190px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222226" vertical={false} />
                <XAxis dataKey="name" stroke="#A1A1AA" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#A1A1AA" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: '#161618'}}
                  contentStyle={{ backgroundColor: '#0D0D0F', border: '1px solid #222226', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#FFD444' }}
                />
                <Bar dataKey="time" fill="#FFD444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Token Volume Graph */}
        <div className="bg-[#0D0D0F] border border-[#222226] rounded-xl p-6 flex-1 min-h-[260px]">
          <h2 className="font-serif-display text-lg text-[#FFFFFF] mb-4">Token Exchange Volume (per Scenario)</h2>
          <div className="h-[190px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222226" vertical={false} />
                <XAxis dataKey="name" stroke="#A1A1AA" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#A1A1AA" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0D0D0F', border: '1px solid #222226', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#FFD444' }}
                />
                <Line type="monotone" dataKey="tokens" stroke="#FFD444" strokeWidth={2} dot={{ fill: '#0D0D0F', stroke: '#FFD444', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}