import DataQualityWarning from '../DataQualityWarning';

export default function DataQualityWarningExample() {
  return (
    <DataQualityWarning message="Insufficient biomarker data points in source document (Table 15.3). Need at least 20 samples per group for statistical validity. Currently only 8 samples identified." />
  );
}
