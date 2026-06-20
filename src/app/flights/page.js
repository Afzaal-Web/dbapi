"use client";

import { useState, useEffect } from "react";
import styles from "../flights.module.css";
import axios from "axios";
import Link from "next/link";

const FlightViewApiTest = () => {
  const [gatewayApiUrl, setGatewayApiUrl] = useState(
    process.env.NEXT_PUBLIC_API_FLIGHTVIEW_URL_DEVP
  );
  const [gatewayApiRequest, setGatewayApiRequest] = useState();
  const [gatewayApiRequestNotes, setGatewayApiRequestNotes] = useState();
  const [gatewayApiResponseStatus, setGatewayApiResponseStatus] = useState("");
  const [gatewayApiResponseText, setGatewayApiResponseText] = useState("");
  const [rawGatewayApiResponse, setRawGatewayApiResponse] = useState(""); // To store raw response
  const [showRaw, setShowRaw] = useState(false); // Toggle between raw and beautified view

  const [inProgress, setInProgress] = useState(false);

  const [infoLabel, setInfoLabel] = useState("");
  const [actionCodes, setActionCodes] = useState([]);
  const [selectedActionCode, setSelectedActionCode] = useState("");
  const [selectedEnvironmentStage, setSelectedEnvironmentStage] = useState("D");

  const showInProgress = () => setInProgress(true);
  const hideInProgress = () => setInProgress(false);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Fetch action codes from JSON file when component mounts
    const fetchActionCodes = async () => {
      try {
        const response = await fetch("/data/requestFlightsPayload.json");
        if (!response.ok) {
          throw new Error("Failed to load action codes");
        }
        const data = await response.json();
        // Sort action codes alphabetically by code before setting state
        const sorted = Array.isArray(data)
          ? data.slice().sort((a, b) => (a.code || "").localeCompare(b.code || ""))
          : data;
        setActionCodes(sorted);
      } catch (error) {
        console.error("Error fetching action codes:", error);
      }
    };

    fetchActionCodes();
  }, []);

  const handleEnvironmentStageChange = async (e) => {
    const selectedStage = e.target.value;
    setSelectedEnvironmentStage(selectedStage);

    if (selectedStage == "S")
      setGatewayApiUrl(process.env.NEXT_PUBLIC_API_FLIGHTVIEW_URL_STAG);
    else if (selectedStage == "P")
      setGatewayApiUrl(process.env.NEXT_PUBLIC_API_FLIGHTVIEW_URL_PROD);
    else setGatewayApiUrl(process.env.NEXT_PUBLIC_API_FLIGHTVIEW_URL_DEVP);
  };

  const handleActionCodeChange = async (e) => {
    const selectedCode = e.target.value;
    setSelectedActionCode(selectedCode);

    // Find selected action code data
    const selectedAction = actionCodes.find(
      (action) => action.code === selectedCode
    );

    if (selectedAction) {
      setGatewayApiRequest(JSON.stringify(selectedAction.payload, null, 2));
      setGatewayApiRequestNotes(selectedAction.notes);
    }
  };

  const toggleResponseView = () => {
    setShowRaw(!showRaw);
    setGatewayApiResponseText(
      showRaw ? beautifyJson(rawGatewayApiResponse) : rawGatewayApiResponse
    );
  };
  const preprocessJson = (jsonString) => {
    try {
      //Parsing is not required for FlightView responses. Let's just return the jsonString as is:
      return jsonString;

      //return JSON.parse(jsonString); // Parse the raw escaped string into a JSON object
    } catch (error) {
      console.error("Error parsing raw JSON string:", error);
      return jsonString; // Return as-is if parsing fails
    }
  };
  const beautifyJson = (jsonString) => {
    try {
      // Handle if input is already an object
      let jsonToProcess = typeof jsonString === 'string' 
        ? jsonString 
        : JSON.stringify(jsonString, null, 2);
      
      const unescapedJson =
        selectedEnvironmentStage == "D"
          ? preprocessJson(jsonToProcess)
          : jsonToProcess;
      return JSON.stringify(JSON.parse(unescapedJson), null, 2);
    } catch (error) {
      console.error("Error beautifying JSON:", error);
      // Return as formatted string regardless of input type
      return typeof jsonString === 'string' 
        ? jsonString 
        : JSON.stringify(jsonString, null, 2);
    }
  };

  const handleCopy = () => {
    navigator.clipboard
      .writeText(gatewayApiResponseText)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset copied status after 2 seconds
      })
      .catch((err) => console.error("Failed to copy: ", err));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    showInProgress();

    try {
      const apiResponse = await callApiGateway(
        gatewayApiUrl,
        gatewayApiRequest
      );

      setGatewayApiResponseStatus(apiResponse.status);
      // Ensure raw response is always a string
      const rawResponse = typeof apiResponse.text === 'string' 
        ? apiResponse.text 
        : JSON.stringify(apiResponse.text, null, 2);
      setRawGatewayApiResponse(rawResponse);
      setGatewayApiResponseText(
        beautifyJson(rawResponse)
      );

      setInfoLabel("API response received successfully.");
    } catch (error) {
      setGatewayApiResponseStatus("Error");
      setRawGatewayApiResponse(error.message);
      setGatewayApiResponseText(error.message);
    } finally {
      hideInProgress();
    }
  };

const callApiGateway = async (url, requestPayload) => {
  try {
    const payload =
      typeof requestPayload === "string"
        ? JSON.parse(requestPayload)
        : requestPayload;

    const response = await axios.post(
      "/api/flightview",
      {
        flightViewUrl: url,
        JsonReq: payload.JsonReq ?? payload,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    let errMsg = error.response?.data || error.message;

    if (typeof errMsg === "object") {
      errMsg = JSON.stringify(errMsg, null, 2);
    }

    return {
      status: "Error",
      text: errMsg,
    };
  }
};


  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>DBAPI Test</h1>
      <div className={styles.lblLink}>
        <a href="/">Gateway API</a>
        <Link href="/database_logs">View Database Logs</Link>
      </div>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.infolabel}>{infoLabel}</label>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="environmentStage" className={styles.label}>
            Environment Stage
          </label>
          <select
            id="environmentStage"
            name="environmentStage"
            value={selectedEnvironmentStage}
            onChange={handleEnvironmentStageChange}
            className={`${styles.input} ${styles.longInput}`}
          >
            <option value="D">Development</option>
            <option value="S">Staging</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="txtGatewayAPIURL" className={styles.label}>
            FlightView API URL
          </label>
          <input
            type="text"
            id="txtGatewayAPIURL"
            name="txtGatewayAPIURL"
            value={gatewayApiUrl}
            onChange={(e) => setGatewayApiUrl(e.target.value)}
            className={`${styles.input} ${styles.longInput}`}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="actionCode" className={styles.label}>
            FlightView API Request Action Code
          </label>
          <select
            id="actionCode"
            name="actionCode"
            value={selectedActionCode}
            onChange={handleActionCodeChange}
            className={`${styles.input} ${styles.longInput}`}
          >
            <option value="">Select Action Code</option>
            {actionCodes.map((action) => (
              <option key={action.code} value={action.code}>
                {action.code}
                {" ( "}
                {action.desc}
                {" )"}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="txtGatewayAPIRequest" className={styles.label}>
            FlightView API Request Payload
          </label>
          <textarea
            id="txtGatewayAPIRequest"
            name="txtGatewayAPIRequest"
            value={gatewayApiRequest}
            onChange={(e) => setGatewayApiRequest(e.target.value)}
            className={styles.textArea}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="txtGatewayAPIRequest" className={styles.label}>
            Gateway API Call Notes
          </label>
          <textarea
            id="txtGatewayAPIRequestNotes"
            name="txtGatewayAPIRequestNotes"
            value={gatewayApiRequestNotes}
            onChange={(e) => setGatewayApiRequestNotes(e.target.value)}
            className={styles.textAreaSmall}
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="txtGatewayAPIResponseStatus" className={styles.label}>
            FlightView API Response Status
          </label>
          <input
            type="text"
            id="txtGatewayAPIResponseStatus"
            name="txtGatewayAPIResponseStatus"
            value={gatewayApiResponseStatus}
            readOnly
            className={`${styles.input} ${styles.readOnlyInput}`}
          />
        </div>
        <div className={styles.formGroup}>
          <div className={styles.labelContainer}>
            <label htmlFor="txtGatewayAPIResponseText" className={styles.label}>
              FlightView API Response
            </label>
            <a
              onClick={toggleResponseView}
              className={styles.toggleLink}
              style={{
                display: gatewayApiResponseText == "" ? "none" : "block",
              }}
            >
              {showRaw ? "Beautify JSON Response" : "Show Raw JSON Response"}
            </a>
          </div>

          <textarea
            id="txtGatewayAPIResponseText"
            name="txtGatewayAPIResponseText"
            value={gatewayApiResponseText}
            readOnly
            className={styles.textArea}
            hidden={true}
          />

          <div style={{ position: "relative" }}>
            {/* Copy Code Link */}
            <span
              onClick={handleCopy}
              className={styles.copyCode}
              style={{
                display: gatewayApiResponseText == "" ? "none" : "block",
              }}
            >
              {copied ? "Copied!" : "Copy Code"}
            </span>
            {/* Code Block */}
            <pre>
              <code className={styles.codeWrap}>{gatewayApiResponseText}</code>
            </pre>
          </div>
        </div>
        <div className={styles.formGroup}>
          <button
            type="submit"
            name="btnSubmit"
            className={styles.submitButton}
          >
            {inProgress ? "Making Request..." : "Make API Request"}
          </button>
        </div>
        <div className={styles.lblLink}>
          <Link href="mailto:kazimbukhari@gmail.com">Report Issues</Link>
        </div>
      </form>
    </div>
  );
};

export default FlightViewApiTest;
