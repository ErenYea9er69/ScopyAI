/**
 * ReportPDF — Server-side PDF generation using @react-pdf/renderer.
 *
 * Renders a premium-styled multi-page intelligence report PDF.
 * Called from the API route GET /api/report/[id]/pdf
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import type { FullReport } from '@/types/report';

// -- Register fonts (system-safe fallback) --
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hjQ.woff2', fontWeight: 500 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hjQ.woff2', fontWeight: 700 },
  ],
});

// -- Styles --
const c = {
  bg: '#0D0F11',
  surface: '#13161A',
  surface2: '#1A1E24',
  border: '#23282F',
  text: '#E8E8EB',
  muted: '#6B7280',
  accent: '#C8F264',
  red: '#FF4D6A',
  blue: '#64AAFF',
};

const s = StyleSheet.create({
  page: {
    backgroundColor: c.bg,
    color: c.text,
    fontFamily: 'Inter',
    fontSize: 10,
    padding: 40,
    paddingBottom: 60,
  },
  // -- Cover --
  coverPage: {
    backgroundColor: c.bg,
    color: c.text,
    fontFamily: 'Inter',
    padding: 50,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  coverBadge: {
    fontSize: 9,
    color: c.accent,
    backgroundColor: '#1A2E0E',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: c.text,
    textAlign: 'center',
    marginBottom: 12,
    maxWidth: 400,
  },
  coverSubtitle: {
    fontSize: 12,
    color: c.muted,
    textAlign: 'center',
    marginBottom: 40,
    maxWidth: 350,
  },
  coverMeta: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 10,
  },
  coverMetaItem: {
    backgroundColor: c.surface2,
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 100,
  },
  coverMetaLabel: {
    fontSize: 8,
    color: c.muted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  coverMetaValue: {
    fontSize: 14,
    fontWeight: 700,
    color: c.accent,
  },
  // -- Section --
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    marginTop: 24,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  sectionIcon: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: c.text,
  },
  // -- Cards --
  card: {
    backgroundColor: c.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: 500,
    color: c.text,
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 9,
    color: c.muted,
    lineHeight: 1.5,
  },
  // -- Confidence badge --
  confidenceBadge: {
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  confHigh: { backgroundColor: '#0D2818', color: '#4ADE80' },
  confMedium: { backgroundColor: '#2E1F0A', color: '#FBBF24' },
  confLow: { backgroundColor: '#2E0A0A', color: '#FF4D6A' },
  // -- Table --
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingVertical: 6,
  },
  tableCell: {
    fontSize: 9,
    color: c.muted,
    flex: 1,
    paddingRight: 6,
  },
  tableCellBold: {
    fontSize: 9,
    color: c.text,
    fontWeight: 500,
    flex: 1,
    paddingRight: 6,
  },
  // -- Debate --
  debateCard: {
    backgroundColor: c.surface,
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  debateAgent: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 4,
  },
  debateScore: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 6,
  },
  // -- Footer --
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: c.muted,
  },
  // -- Pivot --
  pivotCard: {
    backgroundColor: c.surface2,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: c.accent,
    borderLeftWidth: 3,
  },
  // -- Source --
  sourceItem: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 3,
  },
  sourceUrl: {
    fontSize: 8,
    color: c.blue,
    flex: 1,
  },
  sourceBadge: {
    fontSize: 7,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
});

// -- Helpers --

function ConfBadge({ level }: { level: string }) {
  const style =
    level === 'high' ? s.confHigh :
    level === 'medium' ? s.confMedium : s.confLow;
  return <Text style={[s.confidenceBadge, style]}>{level.toUpperCase()}</Text>;
}

function PageFooter({ reportId }: { reportId: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>ScopyAI Intelligence Report</Text>
      <Text>{reportId}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

// -- Layer renderers --

function renderGenericLayer(data: any): React.ReactNode {
  if (!data) return null;
  const nodes: React.ReactNode[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (key === 'notFound' || key === 'confidenceScore') continue;

    if (Array.isArray(value)) {
      nodes.push(
        <View key={key} style={s.card}>
          <Text style={s.cardTitle}>{formatKey(key)}</Text>
          {value.slice(0, 8).map((item: any, i: number) => (
            <View key={i} style={{ marginBottom: 4 }}>
              {typeof item === 'object' ? (
                <Text style={s.cardBody}>
                  {Object.entries(item)
                    .filter(([k]) => k !== 'confidence')
                    .map(([k, v]) => `${formatKey(k)}: ${v}`)
                    .join(' · ')}
                  {item.confidence ? ` [${item.confidence}]` : ''}
                </Text>
              ) : (
                <Text style={s.cardBody}>• {String(item)}</Text>
              )}
            </View>
          ))}
          {value.length > 8 && (
            <Text style={{ fontSize: 8, color: c.muted, marginTop: 4 }}>
              + {value.length - 8} more items
            </Text>
          )}
        </View>
      );
    } else if (typeof value === 'object' && value !== null) {
      nodes.push(
        <View key={key} style={s.card}>
          <Text style={s.cardTitle}>{formatKey(key)}</Text>
          {Object.entries(value)
            .filter(([k]) => k !== 'confidence')
            .map(([k, v]) => (
              <Text key={k} style={s.cardBody}>
                {formatKey(k)}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
              </Text>
            ))}
        </View>
      );
    } else {
      nodes.push(
        <View key={key} style={s.card}>
          <Text style={s.cardTitle}>{formatKey(key)}</Text>
          <Text style={s.cardBody}>{String(value)}</Text>
        </View>
      );
    }
  }

  return <>{nodes}</>;
}

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

// -- Layer config --

const LAYERS = [
  { key: 'layer1', title: 'Layer 1 — Audience Intelligence', icon: '🔥' },
  { key: 'layer2', title: 'Layer 2 — Market Intelligence', icon: '📊' },
  { key: 'layer3', title: 'Layer 3 — Survival Intelligence', icon: '📉' },
  { key: 'layer4', title: 'Layer 4 — Competitor Intelligence', icon: '🎯' },
  { key: 'layer5', title: 'Layer 5 — Unit Economics', icon: '💰' },
  { key: 'layer6', title: 'Layer 6 — Offer & GTM', icon: '🚀' },
  { key: 'layer7', title: 'Layer 7 — Anti-Commoditisation', icon: '🛡' },
  { key: 'layer8', title: 'Layer 8 — Persona-Specific', icon: '🎭' },
];

// ===== MAIN DOCUMENT =====

export function ReportPDF({ report }: { report: FullReport }) {
  return (
    <Document
      title={`ScopyAI Report: ${report.niche}`}
      author="ScopyAI Intelligence Engine"
      subject={`Market intelligence report for ${report.niche}`}
    >
      {/* === COVER PAGE === */}
      <Page size="A4" style={s.coverPage}>
        <Text style={s.coverBadge}>ScopyAI Intelligence Report</Text>
        <Text style={s.coverTitle}>{report.niche}</Text>
        <Text style={s.coverSubtitle}>
          Deep market intelligence generated for the {report.persona} archetype.
          Cross-referenced across {report.sources.length} intelligence signals.
        </Text>
        <View style={s.coverMeta}>
          <View style={s.coverMetaItem}>
            <Text style={s.coverMetaLabel}>Archetype</Text>
            <Text style={s.coverMetaValue}>{report.persona}</Text>
          </View>
          <View style={s.coverMetaItem}>
            <Text style={s.coverMetaLabel}>Score</Text>
            <Text style={s.coverMetaValue}>
              {report.debate?.compositeScore ?? '---'}/100
            </Text>
          </View>
          <View style={s.coverMetaItem}>
            <Text style={s.coverMetaLabel}>Sources</Text>
            <Text style={s.coverMetaValue}>{report.sources.length}</Text>
          </View>
          <View style={s.coverMetaItem}>
            <Text style={s.coverMetaLabel}>Generated</Text>
            <Text style={[s.coverMetaValue, { fontSize: 10 }]}>
              {new Date(report.generatedAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <PageFooter reportId={report.id} />
      </Page>

      {/* === EXECUTIVE SUMMARY === */}
      {report.debate && (
        <Page size="A4" style={s.page}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Executive Summary — Tri-Agent Verdict</Text>
          </View>

          <Text style={[s.cardBody, { marginBottom: 16 }]}>
            {report.debate.finalVerdict}
          </Text>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {/* Builder */}
            <View style={[s.debateCard, { flex: 1 }]}>
              <Text style={[s.debateAgent, { color: '#4ADE80' }]}>Builder</Text>
              <Text style={[s.debateScore, { color: '#4ADE80' }]}>
                {report.debate.builder.score}/100
              </Text>
              <Text style={s.cardBody}>{report.debate.builder.signal}</Text>
              <Text style={[s.cardBody, { marginTop: 4 }]}>
                {report.debate.builder.reasoning}
              </Text>
            </View>

            {/* Cynic */}
            <View style={[s.debateCard, { flex: 1 }]}>
              <Text style={[s.debateAgent, { color: c.red }]}>Cynic</Text>
              <Text style={[s.debateScore, { color: c.red }]}>
                {report.debate.cynic.score}/100
              </Text>
              <Text style={s.cardBody}>{report.debate.cynic.signal}</Text>
              <Text style={[s.cardBody, { marginTop: 4 }]}>
                {report.debate.cynic.reasoning}
              </Text>
            </View>

            {/* Operator */}
            <View style={[s.debateCard, { flex: 1 }]}>
              <Text style={[s.debateAgent, { color: c.blue }]}>Operator</Text>
              <Text style={[s.debateScore, { color: c.blue }]}>
                {report.debate.operator.score}/100
              </Text>
              <Text style={s.cardBody}>{report.debate.operator.signal}</Text>
              <Text style={[s.cardBody, { marginTop: 4 }]}>
                {report.debate.operator.reasoning}
              </Text>
            </View>
          </View>

          <View style={[s.card, { borderColor: c.accent, borderWidth: 1.5 }]}>
            <Text style={[s.cardTitle, { color: c.accent }]}>Composite Score</Text>
            <Text style={[s.debateScore, { color: c.accent }]}>
              {report.debate.compositeScore}/100
            </Text>
          </View>

          <PageFooter reportId={report.id} />
        </Page>
      )}

      {/* === LAYER PAGES === */}
      {LAYERS.map((layer) => {
        const data = report.layers[layer.key as keyof typeof report.layers];
        if (!data) return null;

        return (
          <Page key={layer.key} size="A4" style={s.page}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionIcon}>{layer.icon}</Text>
              <Text style={s.sectionTitle}>{layer.title}</Text>
            </View>

            {renderGenericLayer(data)}

            {/* Not Found section */}
            {(data as any)?.notFound?.length > 0 && (
              <View style={[s.card, { borderColor: '#3a3a3a', marginTop: 12 }]}>
                <Text style={[s.cardTitle, { color: c.muted }]}>
                  Data Transparency — What We Could Not Find
                </Text>
                {(data as any).notFound.map((item: string, i: number) => (
                  <Text key={i} style={[s.cardBody, { marginBottom: 2 }]}>
                    • {item}
                  </Text>
                ))}
              </View>
            )}

            <PageFooter reportId={report.id} />
          </Page>
        );
      })}

      {/* === AUTO-PIVOT PAGE === */}
      {report.autoPivot && (
        <Page size="A4" style={s.page}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionIcon}>🔄</Text>
            <Text style={s.sectionTitle}>Auto-Pivot Engine — Alternative Opportunities</Text>
          </View>

          <View style={[s.card, { borderColor: c.red }]}>
            <Text style={[s.cardTitle, { color: c.red }]}>Pivot Triggered</Text>
            <Text style={s.cardBody}>{report.autoPivot.reason}</Text>
          </View>

          {report.autoPivot.pivots.map((pivot, i) => (
            <View key={i} style={s.pivotCard}>
              <Text style={[s.cardTitle, { color: c.accent }]}>
                {pivot.rank}: {pivot.title}
              </Text>
              <Text style={s.cardBody}>{pivot.description}</Text>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                <Text style={{ fontSize: 8, color: c.accent }}>
                  New Saturation: {pivot.newSaturation}%
                </Text>
                <Text style={{ fontSize: 8, color: c.blue }}>
                  Execution Fit: {pivot.executionFit}
                </Text>
              </View>
              <Text style={[s.cardBody, { marginTop: 6 }]}>{pivot.reasoning}</Text>
            </View>
          ))}

          <PageFooter reportId={report.id} />
        </Page>
      )}

      {/* === SOURCE BIBLIOGRAPHY === */}
      <Page size="A4" style={s.page}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionIcon}>📚</Text>
          <Text style={s.sectionTitle}>
            Source Bibliography — {report.sources.length} Intelligence Signals
          </Text>
        </View>

        {report.sources.map((source, i) => (
          <View key={i} style={s.sourceItem}>
            <Text style={{ fontSize: 8, color: c.muted, width: 20 }}>{i + 1}.</Text>
            <Text style={s.sourceUrl}>{source.title || source.url}</Text>
            <Text
              style={[
                s.sourceBadge,
                source.confidence === 'high'
                  ? s.confHigh
                  : source.confidence === 'medium'
                  ? s.confMedium
                  : s.confLow,
              ]}
            >
              {source.confidence}
            </Text>
          </View>
        ))}

        <PageFooter reportId={report.id} />
      </Page>
    </Document>
  );
}
