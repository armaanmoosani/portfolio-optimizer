import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontSize: 12,
        fontFamily: 'Helvetica'
    },
    header: {
        fontSize: 24,
        marginBottom: 20,
        fontWeight: 'bold',
        borderBottom: '2 solid #000',
        paddingBottom: 10
    },
    section: {
        marginBottom: 20
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        borderBottom: '1 solid #ccc',
        paddingBottom: 5
    },
    grid: {
        display: 'flex',
        flexDirection: 'row',
        marginBottom: 10
    },
    gridItem: {
        flex: 1,
        marginRight: 10
    },
    label: {
        fontSize: 10,
        color: '#666',
        marginBottom: 3
    },
    value: {
        fontSize: 14,
        fontWeight: 'bold'
    },
    table: {
        display: 'table',
        width: 'auto',
        marginTop: 10
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderColor: '#ddd',
        paddingVertical: 5
    },
    tableHeader: {
        backgroundColor: '#f0f0f0',
        fontWeight: 'bold'
    },
    tableCell: {
        flex: 1,
        fontSize: 9,
        padding: 3
    }
});

const formatPercent = (value) => `${(value * 100).toFixed(2)}%`;
const formatCurrency = (value) => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
}).format(value);

export const PDFDocument = ({ data }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <Text style={styles.header}>Portfolio Analytics Report</Text>
            <Text style={{ fontSize: 10, color: '#666', marginBottom: 20 }}>
                Generated on {new Date().toLocaleDateString()}
            </Text>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Performance Summary</Text>
                <View style={styles.grid}>
                    <View style={styles.gridItem}>
                        <Text style={styles.label}>Annualized Return</Text>
                        <Text style={styles.value}>{formatPercent(data.metrics.expectedReturn / 100)}</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <Text style={styles.label}>Volatility</Text>
                        <Text style={styles.value}>{formatPercent(data.metrics.volatility / 100)}</Text>
                    </View>
                </View>
                <View style={styles.grid}>
                    <View style={styles.gridItem}>
                        <Text style={styles.label}>Sharpe Ratio</Text>
                        <Text style={styles.value}>{data.metrics.sharpeRatio.toFixed(2)}</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <Text style={styles.label}>Max Drawdown</Text>
                        <Text style={styles.value}>{formatPercent(data.metrics.maxDrawdown / 100)}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Portfolio Details</Text>
                <View style={styles.grid}>
                    <View style={styles.gridItem}>
                        <Text style={styles.label}>Start Balance</Text>
                        <Text style={styles.value}>{formatCurrency(data.metrics.startBalance)}</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <Text style={styles.label}>End Balance</Text>
                        <Text style={styles.value}>{formatCurrency(data.metrics.endBalance)}</Text>
                    </View>
                </View>
                <View style={styles.grid}>
                    <View style={styles.gridItem}>
                        <Text style={styles.label}>Period</Text>
                        <Text style={styles.value}>
                            {data.performance[0]?.date} - {data.performance[data.performance.length - 1]?.date}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Asset Allocation</Text>
                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <Text style={styles.tableCell}>Asset</Text>
                        <Text style={styles.tableCell}>Weight</Text>
                    </View>
                    {data.assets.map((asset, i) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={styles.tableCell}>{asset}</Text>
                            <Text style={styles.tableCell}>
                                {formatPercent(data.weights.find(w => w.asset === asset)?.weight / 100 || 0)}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
        </Page>

        <Page size="A4" style={styles.page}>
            <Text style={styles.header}>Risk Analysis</Text>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Risk Contributions</Text>
                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <Text style={styles.tableCell}>Asset</Text>
                        <Text style={styles.tableCell}>Weight</Text>
                        <Text style={styles.tableCell}>MCR</Text>
                        <Text style={styles.tableCell}>PCR</Text>
                        <Text style={styles.tableCell}>VaR Contrib</Text>
                        <Text style={styles.tableCell}>CVaR Contrib</Text>
                    </View>
                    {Object.entries(data.risk_contributions || {}).map(([ticker, metrics], i) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={styles.tableCell}>{ticker}</Text>
                            <Text style={styles.tableCell}>{formatPercent(metrics.Weight)}</Text>
                            <Text style={styles.tableCell}>{metrics.MCR.toFixed(4)}</Text>
                            <Text style={styles.tableCell}>{formatPercent(metrics.PCR)}</Text>
                            <Text style={styles.tableCell}>{formatPercent(metrics.Parametric_VaR_Contrib)}</Text>
                            <Text style={styles.tableCell}>{formatPercent(metrics.CVaR_Contrib)}</Text>
                        </View>
                    ))}
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Advanced Risk Metrics</Text>
                <View style={styles.grid}>
                    <View style={styles.gridItem}>
                        <Text style={styles.label}>VaR (95% Daily)</Text>
                        <Text style={styles.value}>{formatPercent(data.metrics.var_95_daily * 100)}</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <Text style={styles.label}>CVaR (95% Daily)</Text>
                        <Text style={styles.value}>{formatPercent(data.metrics.cvar_95_daily * 100)}</Text>
                    </View>
                </View>
                <View style={styles.grid}>
                    <View style={styles.gridItem}>
                        <Text style={styles.label}>Skewness</Text>
                        <Text style={styles.value}>{data.metrics.skewness.toFixed(2)}</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <Text style={styles.label}>Kurtosis</Text>
                        <Text style={styles.value}>{data.metrics.kurtosis.toFixed(2)}</Text>
                    </View>
                </View>
                <View style={styles.grid}>
                    <View style={styles.gridItem}>
                        <Text style={styles.label}>Calmar Ratio</Text>
                        <Text style={styles.value}>{data.metrics.calmar_ratio.toFixed(2)}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Benchmark Comparison</Text>
                <View style={styles.grid}>
                    <View style={styles.gridItem}>
                        <Text style={styles.label}>Beta</Text>
                        <Text style={styles.value}>{data.metrics.beta.toFixed(2)}</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <Text style={styles.label}>Alpha</Text>
                        <Text style={styles.value}>{formatPercent(data.metrics.alpha / 100)}</Text>
                    </View>
                </View>
                <View style={styles.grid}>
                    <View style={styles.gridItem}>
                        <Text style={styles.label}>Information Ratio</Text>
                        <Text style={styles.value}>{data.metrics.information_ratio?.toFixed(2) || '-'}</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <Text style={styles.label}>R-Squared</Text>
                        <Text style={styles.value}>{data.metrics.r_squared?.toFixed(2) || '-'}</Text>
                    </View>
                </View>
            </View>
        </Page>

        <Page size="A4" style={styles.page}>
            <Text style={styles.header}>Drawdowns & Recovery</Text>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top 5 Drawdowns</Text>
                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <Text style={styles.tableCell}>Depth</Text>
                        <Text style={styles.tableCell}>Start</Text>
                        <Text style={styles.tableCell}>Trough</Text>
                        <Text style={styles.tableCell}>End</Text>
                        <Text style={styles.tableCell}>Recovery Days</Text>
                    </View>
                    {data.drawdowns?.map((dd, i) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={styles.tableCell}>{formatPercent(dd.depth * 100)}</Text>
                            <Text style={styles.tableCell}>{dd.start}</Text>
                            <Text style={styles.tableCell}>{dd.trough}</Text>
                            <Text style={styles.tableCell}>{dd.end}</Text>
                            <Text style={styles.tableCell}>{dd.recovery_days}</Text>
                        </View>
                    ))}
                </View>
            </View>

            <Text style={{ fontSize: 8, color: '#999', marginTop: 30, textAlign: 'center' }}>
                Disclaimer: Past performance is not indicative of future results. This report is for informational purposes only.
            </Text>
        </Page>
    </Document>
);
