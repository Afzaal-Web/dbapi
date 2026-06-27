"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "../page.module.css";

const LogDetailsPage = ({ params }) => {
  const [logData, setLogData] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("selectedLogDetails");

    if (saved) {
      const parsed = JSON.parse(saved);

      if (String(parsed.row?.[0]) === String(params.logId)) {
        setLogData(parsed);
      }
    }
  }, [params.logId]);

  const formatValue = (value) => {
    if (value === null || value === undefined || value === "") return "-";

    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }

    return String(value);
  };

  if (!logData) {
    return (
      <div className={styles.container}>
        <Link href="/database_logs">← Back to Logs</Link>
        <h1 className={styles.heading}>Log Details</h1>
        <p>No log data found. Please go back and select a row again.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Link href="/database_logs">← Back to Logs</Link>

      <h1 className={styles.heading}>Log Details #{params.logId}</h1>

      <div className={styles.detailsGrid}>
        {logData.columns.map((column) => (
          <div key={column.key} className={styles.detailCard}>
            <strong>{column.label}</strong>
            <pre>{formatValue(logData.row[column.index])}</pre>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogDetailsPage;