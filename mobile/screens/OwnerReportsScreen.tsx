// Mobile Owner Panel: Reports Parity (canonical commit)
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { useFetchAuthed } from '../hooks/useFetchAuthed';
import { Button, PageShell, Modal } from '../components/ui';
import type { RootStackParamList } from '../types/navigation';
import { useThemeMode, type ThemeDefinition } from '../contexts/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'OwnerReports'>;

export type Report = {
  id: string;
  report_type: string;
  report_reason: string;
  report_details: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  admin_notes: string | null;
  context_details: string | null;
  reporter: {
    username: string;
    display_name: string | null;
  } | null;
  reported_user: {
    id: string;
    username: string;
    display_name: string | null;
  } | null;
};

type ReportStatus = 'all' | 'pending' | 'reviewed' | 'resolved' | 'dismissed';
type ReportType = 'all' | 'user' | 'stream' | 'profile' | 'chat';
type ReportSeverity = 'all' | 'low' | 'medium' | 'high' | 'critical';

export function OwnerReportsScreen({ navigation }: Props) {
  const { fetchAuthed } = useFetchAuthed();
  const { theme } = useThemeMode();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReportStatus>('pending');
  const [typeFilter, setTypeFilter] = useState<ReportType>('all');
  const [severityFilter, setSeverityFilter] = useState<ReportSeverity>('all');
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const itemsPerPage = 20;

  const loadReports = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (!append) setLoading(true);
      setError(null);

      try {
        const offset = (page - 1) * itemsPerPage;
        const statusParam = statusFilter === 'all' ? '' : statusFilter;

        const res = await fetchAuthed(
          `/api/admin/reports?status=${statusParam}&limit=${itemsPerPage}&offset=${offset}`,
          { method: 'GET' }
        );

        if (!res.ok) {
          throw new Error(res.message || 'Failed to load reports');
        }

        const data = res.data as { reports?: Report[] };
        const newReports = data.reports || [];

        if (append) {
          setReports((prev) => [...prev, ...newReports]);
        } else {
          setReports(newReports);
        }

        setHasMore(newReports.length === itemsPerPage);
        setCurrentPage(page);
      } catch (err: any) {
        console.error('Error loading reports:', err);
        setError(err?.message || 'Failed to load reports');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchAuthed, statusFilter]
  );

  useEffect(() => {
    void loadReports(1, false);
  }, [statusFilter]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void loadReports(1, false);
  }, [loadReports]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      void loadReports(currentPage + 1, true);
    }
  }, [loading, hasMore, currentPage, loadReports]);

  const handleReportPress = useCallback((report: Report) => {
    setSelectedReport(report);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedReport(null);
  }, []);

  const handleReportUpdate = useCallback(() => {
    setSelectedReport(null);
    void loadReports(1, false);
  }, [loadReports]);

  // Client-side filtering
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesSearch =
        !searchQuery ||
        report.reported_user?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.reporter?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.report_reason.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === 'all' || report.report_type === typeFilter;

      const severity = getSeverityFromReason(report.report_reason);
      const matchesSeverity = severityFilter === 'all' || severity === severityFilter;

      return matchesSearch && matchesType && matchesSeverity;
    });
  }, [reports, searchQuery, typeFilter, severityFilter]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'pending') count++;
    if (typeFilter !== 'all') count++;
    if (severityFilter !== 'all') count++;
    return count;
  }, [statusFilter, typeFilter, severityFilter]);

  const renderReport = useCallback(
    ({ item }: { item: Report }) => <ReportCard report={item} theme={theme} onPress={handleReportPress} />,
    [theme, handleReportPress]
  );

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Feather name="alert-circle" size={48} color={theme.colors.textMuted} />
        <Text style={styles.emptyTitle}>No reports found</Text>
        <Text style={styles.emptyText}>No reports match your current filters.</Text>
      </View>
    );
  }, [loading, styles, theme]);

  const renderFooter = useCallback(() => {
    if (!hasMore || loading) return null;
    return (
      <View style={styles.footerContainer}>
        <Button title="Load More" onPress={handleLoadMore} variant="secondary" />
      </View>
    );
  }, [hasMore, loading, handleLoadMore, styles]);

  return (
    <PageShell
      title="Reports & Moderation"
      left={<Button title="Back" variant="secondary" onPress={() => navigation.goBack()} style={styles.headerButton} />}
      contentStyle={styles.container}
    >
      {/* Search and Filter Bar */}
      <View style={styles.toolbar}>
        <View style={styles.searchContainer}>
          <Feather name="search" size={16} color={theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by username, reason..."
            placeholderTextColor={theme.colors.textMuted}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <Pressable
          onPress={() => setShowFilterSheet(true)}
          style={({ pressed }) => [styles.filterButton, pressed ? styles.pressed : null]}
        >
          <Feather name="filter" size={18} color={theme.colors.textPrimary} />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Reports List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Feather name="alert-triangle" size={48} color="#ef4444" />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Retry" onPress={handleRefresh} />
        </View>
      ) : (
        <FlatList
          data={filteredReports}
          renderItem={renderReport}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.accent} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Filter Sheet */}
      <FilterSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        severityFilter={severityFilter}
        onStatusChange={setStatusFilter}
        onTypeChange={setTypeFilter}
        onSeverityChange={setSeverityFilter}
        theme={theme}
      />

      {/* Report Detail Bottom Sheet */}
      {selectedReport && (
        <ReportDetailSheet
          report={selectedReport}
          onClose={handleCloseDetail}
          onUpdate={handleReportUpdate}
          theme={theme}
        />
      )}
    </PageShell>
  );
}

// Report Card Component
function ReportCard({ report, theme, onPress }: { report: Report; theme: ThemeDefinition; onPress: (r: Report) => void }) {
  const styles = useMemo(() => createReportCardStyles(theme), [theme]);
  const severity = getSeverityFromReason(report.report_reason);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'user':
        return 'user';
      case 'stream':
        return 'video';
      case 'profile':
        return 'file-text';
      case 'chat':
        return 'message-square';
      default:
        return 'alert-circle';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'reviewed':
        return '#3b82f6';
      case 'resolved':
        return '#10b981';
      case 'dismissed':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'critical':
        return '#ef4444';
      case 'high':
        return '#f97316';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  return (
    <Pressable onPress={() => onPress(report)} style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Feather name={getTypeIcon(report.report_type) as any} size={18} color={theme.colors.textPrimary} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.username} numberOfLines={1}>
            {report.reported_user?.username || 'Unknown User'}
          </Text>
          <Text style={styles.timeAgo}>{formatTimeAgo(report.created_at)}</Text>
        </View>
        <View style={styles.badges}>
          <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(severity) }]}>
            <Text style={styles.severityText}>{severity.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.row}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
            <Text style={styles.statusText}>{report.status}</Text>
          </View>
          <Text style={styles.typeText}>{report.report_type}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.reasonText} numberOfLines={1}>
            {report.report_reason.replace(/_/g, ' ')}
          </Text>
        </View>

        {report.report_details && (
          <Text style={styles.details} numberOfLines={2}>
            {report.report_details}
          </Text>
        )}

        <Text style={styles.reporter}>
          Reported by <Text style={styles.reporterUsername}>@{report.reporter?.username || 'anonymous'}</Text>
        </Text>
      </View>
    </Pressable>
  );
}

// Filter Sheet Component
function FilterSheet({
  visible,
  onClose,
  statusFilter,
  typeFilter,
  severityFilter,
  onStatusChange,
  onTypeChange,
  onSeverityChange,
  theme,
}: {
  visible: boolean;
  onClose: () => void;
  statusFilter: ReportStatus;
  typeFilter: ReportType;
  severityFilter: ReportSeverity;
  onStatusChange: (s: ReportStatus) => void;
  onTypeChange: (t: ReportType) => void;
  onSeverityChange: (s: ReportSeverity) => void;
  theme: ThemeDefinition;
}) {
  const styles = useMemo(() => createFilterSheetStyles(theme), [theme]);

  return (
    <Modal visible={visible} onRequestClose={onClose}>
      <View style={styles.header}>
        <Text style={styles.title}>Filter Reports</Text>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Feather name="x" size={24} color={theme.colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Status</Text>
        <View style={styles.optionsRow}>
          {(['all', 'pending', 'reviewed', 'resolved', 'dismissed'] as ReportStatus[]).map((status) => (
            <Pressable
              key={status}
              onPress={() => onStatusChange(status)}
              style={[styles.chip, statusFilter === status ? styles.chipActive : null]}
            >
              <Text style={[styles.chipText, statusFilter === status ? styles.chipTextActive : null]}>{status}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Type</Text>
        <View style={styles.optionsRow}>
          {(['all', 'user', 'stream', 'profile', 'chat'] as ReportType[]).map((type) => (
            <Pressable
              key={type}
              onPress={() => onTypeChange(type)}
              style={[styles.chip, typeFilter === type ? styles.chipActive : null]}
            >
              <Text style={[styles.chipText, typeFilter === type ? styles.chipTextActive : null]}>{type}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Severity</Text>
        <View style={styles.optionsRow}>
          {(['all', 'low', 'medium', 'high', 'critical'] as ReportSeverity[]).map((severity) => (
            <Pressable
              key={severity}
              onPress={() => onSeverityChange(severity)}
              style={[styles.chip, severityFilter === severity ? styles.chipActive : null]}
            >
              <Text style={[styles.chipText, severityFilter === severity ? styles.chipTextActive : null]}>{severity}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Button title="Apply Filters" onPress={onClose} />
    </Modal>
  );
}

// Report Detail Sheet Component (imported separately for clarity)
// This will be in a separate file for maintainability
import { ReportDetailSheet } from '../components/ReportDetailSheet';

// Utility function
function getSeverityFromReason(reason: string): ReportSeverity {
  const criticalReasons = ['underage', 'violence', 'threats'];
  const highReasons = ['harassment', 'inappropriate_content', 'hate_speech'];
  const mediumReasons = ['inappropriate', 'spam', 'copyright'];

  if (criticalReasons.some((r) => reason.includes(r))) return 'critical';
  if (highReasons.some((r) => reason.includes(r))) return 'high';
  if (mediumReasons.some((r) => reason.includes(r))) return 'medium';
  return 'low';
}

// Styles
function createStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    headerButton: {
      height: 36,
      paddingHorizontal: 12,
    },
    container: {
      flex: 1,
      backgroundColor: theme.tokens.backgroundSecondary,
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 16,
      backgroundColor: theme.colors.cardSurface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    searchContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.cardAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      minHeight: 44,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
      minHeight: 44,
    },
    filterButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: theme.colors.cardAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: '#ef4444',
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    filterBadgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '900',
    },
    pressed: {
      opacity: 0.7,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    loadingText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: 24,
    },
    errorTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: '900',
    },
    errorText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    listContent: {
      padding: 16,
      gap: 12,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
      gap: 12,
    },
    emptyTitle: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: '900',
    },
    emptyText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
    footerContainer: {
      paddingVertical: 16,
      alignItems: 'center',
    },
  });
}

function createReportCardStyles(theme: ThemeDefinition) {
  const cardShadow = theme.elevations.card;
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.cardSurface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
      gap: 10,
      shadowColor: cardShadow.color,
      shadowOpacity: cardShadow.opacity,
      shadowRadius: cardShadow.radius,
      shadowOffset: cardShadow.offset,
      elevation: cardShadow.elevation,
    },
    pressed: {
      opacity: 0.7,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: theme.colors.cardAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerInfo: {
      flex: 1,
      gap: 2,
    },
    username: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    timeAgo: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    badges: {
      flexDirection: 'row',
      gap: 6,
    },
    severityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    severityText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '900',
    },
    body: {
      gap: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    statusText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '800',
    },
    typeText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    dot: {
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    reasonText: {
      flex: 1,
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    details: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 18,
    },
    reporter: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    reporterUsername: {
      color: theme.colors.textPrimary,
      fontWeight: '800',
    },
  });
}

function createFilterSheetStyles(theme: ThemeDefinition) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      fontWeight: '900',
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.cardAlt,
    },
    section: {
      marginBottom: 20,
    },
    label: {
      color: theme.colors.textPrimary,
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 10,
    },
    optionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: theme.colors.cardAlt,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minHeight: 36,
      justifyContent: 'center',
    },
    chipActive: {
      backgroundColor: theme.colors.accentSecondary,
      borderColor: theme.colors.accentSecondary,
    },
    chipText: {
      color: theme.colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'capitalize',
    },
    chipTextActive: {
      color: '#fff',
      fontWeight: '900',
    },
  });
}

