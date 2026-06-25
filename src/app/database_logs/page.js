"use client";

import { useState } from "react";
import styles from "./page.module.css";
import axios from "axios";
import Link from "next/link";
import { jsonrepair } from "jsonrepair";

const DatabaseViewer = () => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [limit, setLimit] = useState("50");
  const [modalContent, setModalContent] = useState("");
const [showModal, setShowModal] = useState(false);

  const [responseStatus, setResponseStatus] = useState("");
  const [inProgress, setInProgress] = useState(false);

  const [tableHeaders, setTableHeaders] = useState([]);
  const [tableRows, setTableRows] = useState([]);
  const [errorText, setErrorText] = useState("");

  const parseDBAPIResponse = (value) => {
    let parsed = value;

    while (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        parsed = JSON.parse(jsonrepair(parsed));
      }
    }

    return parsed;
  };

 const formatCellValue = (cell) => {
  if (cell === null || cell === undefined) return "";

  if (typeof cell === "object") {
    return JSON.stringify(cell, null, 2);
  }

  return String(cell);
};

const getShortText = (value) => {
  const text = formatCellValue(value);
  const words = text.split(/\s+/);

  if (words.length <= 5) return text;

  return words.slice(0, 5).join(" ") + "...";
};

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fromDate || !toDate || !limit) {
      setResponseStatus("Error");
      setErrorText("Please fill From Date, To Date, and Limit.");
      setTableHeaders([]);
      setTableRows([]);
      return;
    }

    setInProgress(true);
    setResponseStatus("");
    setErrorText("");
    setTableHeaders([]);
    setTableRows([]);

    try {
      const payloadResponse = await fetch("/data/requestPayload.json");
      const payloads = await payloadResponse.json();

      const selectedPayload = payloads.find(
        (item) => item.code === "S.DATABASE.LOGS"
      );

      if (!selectedPayload) {
        throw new Error("S.DATABASE.LOGS payload not found.");
      }

      const dbapiPayload = structuredClone(selectedPayload.payload);

      dbapiPayload.JsonReq.JMetaData = {
        ...dbapiPayload.JsonReq.JMetaData,
        p_FROM_DATE: fromDate,
        p_TO_DATE: toDate,
        p_LIMIT: limit,
      };

      dbapiPayload.JsonReq.JHeader = {
        ...dbapiPayload.JsonReq.JHeader,
        ViewName: dbapiPayload.ViewName,
        ActionCode: dbapiPayload.ActionCode,
        RequestedURL: process.env.NEXT_PUBLIC_DBAPI_DEV_URL,
      };

      const response = await axios.post("/api/dblogs", {
        ...dbapiPayload,
        dbapiUrl: process.env.NEXT_PUBLIC_DBAPI_DEV_URL,
      });

      setResponseStatus(response.data.status);

      const parsedResponse = parseDBAPIResponse(response.data.text);

      const headings = parsedResponse?.JMetaData?.Headings || [];
      const rows = parsedResponse?.JData || [];

      const columns = headings.map((heading, index) => ({
        key: heading[0],
        label: heading[1],
        index,
      }));

      const normalizedRows = rows.map((row) => {
        const fixedRow = [...row];

        if (
          !fixedRow[12] &&
          fixedRow[13] &&
          typeof fixedRow[13] === "object"
        ) {
          fixedRow[12] = fixedRow[13];
          fixedRow[13] = "";
        }

        return fixedRow;
      });

      setTableHeaders(columns);
      setTableRows(normalizedRows);

      if (rows.length === 0) {
        setErrorText("No records found.");
      }
    } catch (error) {
      setResponseStatus("Error");
      setErrorText(error.message || "Something went wrong.");
      setTableHeaders([]);
      setTableRows([]);
    } finally {
      setInProgress(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Database Logs Viewer</h1>

      <div className={styles.lblLink}>
        <Link href="/">DBAPI</Link>
        <Link href="/flights">Flightview API</Link>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.filterRow}>
          <div className={styles.field}>
            <label className={styles.label}>From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Limit</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className={styles.input}
              min="1"
            />
          </div>

          <div className={styles.buttonWrapper}>
            <button type="submit" className={styles.submitButton}>
              {inProgress ? "Loading..." : "Fetch Database Logs"}
            </button>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Response Status</label>
          <input
            type="text"
            value={responseStatus}
            readOnly
            className={`${styles.input} ${styles.readOnlyInput}`}
          />
        </div>

        {errorText && (
          <div className={styles.formGroup}>
            <pre>
              <code className={styles.codeWrap}>{errorText}</code>
            </pre>
          </div>
        )}

        {tableRows.length > 0 && (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {tableHeaders.map((column) => (
                    <th key={column.key}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {tableRows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {tableHeaders.map((column) => (
                     <td key={`${rowIndex}-${column.key}`}>
  {column.key === "PARAMS" && row[column.index] ? (
    <>
      <span>{getShortText(row[column.index])}</span>
      <button
        type="button"
        className={styles.seeMoreButton}
        onClick={() => {
          setModalContent(formatCellValue(row[column.index]));
          setShowModal(true);
        }}
      >
        See more
      </button>
    </>
  ) : (
    formatCellValue(row[column.index])
  )}
</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </form>
      {showModal && (
  <div className={styles.modalOverlay}>
    <div className={styles.modalBox}>
      <div className={styles.modalHeader}>
        <h3>Params Details</h3>
        <button
          type="button"
          className={styles.closeButton}
          onClick={() => setShowModal(false)}
        >
          ×
        </button>
      </div>

      <pre className={styles.modalContent}>{modalContent}</pre>
    </div>
  </div>
)}
    </div>
  );
};

export default DatabaseViewer;