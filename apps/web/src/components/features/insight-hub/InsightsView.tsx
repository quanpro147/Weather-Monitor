import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useGlobalFilter } from '../../../hooks/useGlobalFilter';
import { useAnomalyData } from '../../../hooks/useAnomalyData';
import { useWeatherData } from '../../../hooks/useWeatherData';
import { getWeatherAdvisory } from '../../../services/weather.service';
import type { AdvisoryResponse } from '../../../types/weather';
import AiSummaryPanel from './AiSummaryPanel';
import AnomalyScatterChart from './AnomalyScatterChart';
import type { ScatterPoint } from './AnomalyScatterChart';
import AnomalyTimeline from './AnomalyTimeline';
import AlertList from './AlertList';

export default function InsightsView() {
    const { isDark } = useTheme();
    const { cityId, startDate, endDate } = useGlobalFilter();
    const [advisory, setAdvisory] = React.useState<AdvisoryResponse | null>(null);
    const [advisoryLoading, setAdvisoryLoading] = React.useState(false);
    const [advisoryError, setAdvisoryError] = React.useState<string | null>(null);

    const {
        records: anomalyRecords,
        isLoading: anomalyLoading,
        error: anomalyError,
    } = useAnomalyData({
        cityId,
        startDate,
        endDate,
        enabled: cityId !== null,
    });

    const {
        history,
        isLoading: weatherLoading,
        error: weatherError,
    } = useWeatherData({
        cityId,
        startDate,
        endDate,
        enabled: cityId !== null,
    });

    const scatterChartData = React.useMemo<ScatterPoint[]>(() => {
        if (history.length === 0) {
            return [];
        }

        const anomalyByDate = new Map(
            anomalyRecords.map((record) => [record.date, record]),
        );

        return history
            .map((dayData) => {
                const temp = dayData.temperature_2m_max ?? dayData.temperature_2m_mean ?? dayData.temperature_2m_min;
                const humidity = dayData.relative_humidity_2m_mean;
                if (temp === null || temp === undefined || humidity === null || humidity === undefined) {
                    return null;
                }

                const anomalyDetail = anomalyByDate.get(dayData.date);

                return {
                    temp,
                    humidity,
                    is_anomaly: anomalyDetail?.is_anomaly ?? false,
                    anomaly_score: anomalyDetail?.anomaly_score ?? 0,
                    date: dayData.date,
                };
            })
            .filter((item): item is ScatterPoint => item !== null);
    }, [anomalyRecords, history]);

    React.useEffect(() => {
        let active = true;

        const loadAdvisory = async () => {
            if (cityId === null) {
                setAdvisory(null);
                setAdvisoryError(null);
                return;
            }

            setAdvisoryLoading(true);
            setAdvisoryError(null);

            try {
                const nextAdvisory = await getWeatherAdvisory(cityId);
                if (!active) {
                    return;
                }
                setAdvisory(nextAdvisory);
            } catch (error) {
                if (!active) {
                    return;
                }
                setAdvisory(null);
                setAdvisoryError(error instanceof Error ? error.message : 'Failed to load advisory data');
            } finally {
                if (active) {
                    setAdvisoryLoading(false);
                }
            }
        };

        void loadAdvisory();

        return () => {
            active = false;
        };
    }, [cityId]);

    return (
        <div className="mx-auto w-full max-w-[1500px] flex flex-col gap-6 animate-in fade-in duration-700">
            
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className={`text-xl font-black tracking-tight ${isDark ? 'text-[#f3f4f6]' : 'text-gray-900'}`}>AI Insights & Diagnostics</h2>
                    <p className={`text-xs font-medium mt-1 ${isDark ? 'text-[#9ca3af]' : 'text-gray-500'}`}>Powered by Gemini 2.5 Flash & Isolation Forest ML</p>
                </div>
            </div>

            {cityId === null && (
                <div className={`rounded-xl border p-3 text-sm ${isDark ? 'border-[#2a2d33] text-gray-300 bg-[#1e1e1e]' : 'border-gray-200 text-gray-700 bg-white'}`}>
                    Chon thanh pho tu bo loc tren cung de xem AI insight va anomaly diagnostics.
                </div>
            )}

            {/* TẦNG 1: LLM SUMMARY (Bóc tách từ Backend) */}
            <section className={`p-6 rounded-2xl border shadow-sm ${isDark ? 'bg-[#1e1e1e] border-[#2a2a2a]' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-4">
                    <i className="fa-solid fa-wand-magic-sparkles text-cyan-500"></i>
                    <h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-[#f3f4f6]' : 'text-gray-900'}`}>LLM Weather Summary</h3>
                </div>
                <AiSummaryPanel cityId={cityId} />
            </section>

            {/* TẦNG 2 & 3: XAI SCATTER PLOT & TIMELINE */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                
                {/* Scatter Plot (6 cột) */}
                <section className={`p-6 rounded-2xl border shadow-sm xl:col-span-7 flex flex-col ${isDark ? 'bg-[#1e1e1e] border-[#2a2a2a]' : 'bg-white border-gray-200'}`}>
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-[#f3f4f6]' : 'text-gray-900'}`}>Isolation Forest Analysis</h3>
                            <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Outlier detection visualization</p>
                        </div>
                    </div>
                    <div className="flex-1 bg-gray-50 dark:bg-[#151515] rounded-xl border border-gray-100 dark:border-[#2a2a2a] p-2">
                        <AnomalyScatterChart data={scatterChartData} />
                    </div>
                </section>

                {/* Timeline (5 cột) */}
                <section className={`p-6 rounded-2xl border shadow-sm xl:col-span-5 flex flex-col ${isDark ? 'bg-[#1e1e1e] border-[#2a2a2a]' : 'bg-white border-gray-200'}`}>
                    <div className="mb-6">
                        <h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-[#f3f4f6]' : 'text-gray-900'}`}>Explainable AI (xAI) Log</h3>
                        <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Why anomalies were flagged</p>
                    </div>
                    <div className="flex-1">
                        <AnomalyTimeline records={anomalyRecords} />
                    </div>
                </section>
                
            </div>

            <section className={`p-6 rounded-2xl border shadow-sm ${isDark ? 'bg-[#1e1e1e] border-[#2a2a2a]' : 'bg-white border-gray-200'}`}>
                <div className="mb-4">
                    <h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-[#f3f4f6]' : 'text-gray-900'}`}>Live Alert Stream</h3>
                    <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Rule-based advisory + top anomaly signals</p>
                </div>
                <AlertList
                    advisory={advisory}
                    records={anomalyRecords}
                    isLoading={advisoryLoading || anomalyLoading || weatherLoading}
                    error={advisoryError ?? anomalyError ?? weatherError}
                />
            </section>
        </div>
    );
}