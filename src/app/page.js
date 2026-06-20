"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import axios from "axios";
import Link from "next/link";

const GatewayApiTest = () => {
  const [gatewayApiUrl, setGatewayApiUrl] = useState(
    process.env.NEXT_PUBLIC_DBAPI_DEV_URL
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
  const showGettingToken = () => setGettingToken(true);
  const hideGettingToken = () => setGettingToken(false);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Fetch action codes from JSON file when component mounts
    const fetchActionCodes = async () => {
      try {
        const response = await fetch("/data/requestPayload.json");
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
      setGatewayApiUrl(process.env.NEXT_PUBLIC_DBAPI_STAG_URL);
    else if (selectedStage == "P")
      setGatewayApiUrl(process.env.NEXT_PUBLIC_DBAPI_PROD_URL);
    else setGatewayApiUrl(process.env.NEXT_PUBLIC_DBAPI_DEV_URL);
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
      return JSON.parse(jsonString); // Parse the raw escaped string into a JSON object
    } catch (error) {
      console.error("Error parsing raw JSON string:", error);
      return jsonString; // Return as-is if parsing fails
    }
  };
  const beautifyJson = (jsonString) => {
    try {
      // Handle non-string inputs
      if (typeof jsonString !== 'string') {
        jsonString = JSON.stringify(jsonString);
      }
      const unescapedJson =
        selectedEnvironmentStage == "D"
          ? preprocessJson(jsonString)
          : jsonString;
      return JSON.stringify(JSON.parse(unescapedJson), null, 2);
    } catch (error) {
      console.error("Error beautifying JSON:", error);
      // Return as string regardless of input type
      return typeof jsonString === 'string' ? jsonString : JSON.stringify(jsonString);
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

    // Validate that a payload is provided
    if (!gatewayApiRequest || gatewayApiRequest.trim() === "") {
      setGatewayApiResponseStatus("Error");
      setGatewayApiResponseText("Error: Please select an action code or provide a request payload");
      return;
    }

    showInProgress();

    try {
      let info = "";

      // For DBAPI, we don't use authentication tokens, we send the request directly
      const isDBAPI = gatewayApiUrl.includes("DBAPI");

      // Step 2: Make a request to DBAPI or API Gateway
      const apiResponse = await callApiGateway(
        gatewayApiUrl,
        gatewayApiRequest,
        isDBAPI
      );
      setGatewayApiResponseStatus(apiResponse.status);
      setRawGatewayApiResponse(apiResponse.text); // Save raw response
      setGatewayApiResponseText(beautifyJson(apiResponse.text)); // Save beautified response

      const statusString = String(apiResponse.status);
      if (statusString.includes("200"))
        info += "API response received successfully.";

      setInfoLabel(info);
    } catch (error) {
      setGatewayApiResponseStatus("Error");
      let errorMsg = error.message || "Unknown error";
      if (typeof errorMsg === 'object') {
        errorMsg = JSON.stringify(errorMsg, null, 2);
      }
      setRawGatewayApiResponse(String(errorMsg));
      setGatewayApiResponseText(String(errorMsg));
    } finally {
      hideInProgress();
    }
  };

  const callApiGateway = async (url, requestPayload, isDBAPI = false) => {
    try {
      let data;
      let headers;

      if (isDBAPI) {
        // For DBAPI, use backend proxy at /api/dbapi
        // Parse the JSON request payload to extract DBAPI fields
        let dbapiPayload;
        try {
          dbapiPayload = typeof requestPayload === 'string' ? JSON.parse(requestPayload) : requestPayload;
        } catch (e) {
          // If payload can't be parsed, try to use it as default DBAPI payload
          dbapiPayload = {
            ActionCode: "SPAGESMENU",
            ViewName: "VIEWPAGE",
            ClientIP: "::1",
            JsonReq: requestPayload,
            Notes: "1"
          };
        }

        // Create request for backend proxy - always use correct JsonReq structure per developer spec
        // Extract JData from the selected payload if it exists
        const jData = dbapiPayload.JsonReq?.JData || {};
        const jMetaData = dbapiPayload.JsonReq?.JMetaData || {};
        const jHeader = dbapiPayload.JsonReq?.JHeader || {};

        data = {
          ActionCode: dbapiPayload.ActionCode || 'SPAGESMENU',
          ViewName: dbapiPayload.ViewName || dbapiPayload.PageName || 'VIEWPAGE',
          ClientIP: dbapiPayload.ClientIP || '::1',
          JsonReq: {
            JHeader: {
              ...jHeader, // Use the JHeader from payload (which has APILogin, APIPassword, etc.)
              ViewName: dbapiPayload.ViewName || dbapiPayload.PageName || jHeader.ViewName || "VIEWPAGE",
              ActionCode: dbapiPayload.ActionCode || jHeader.ActionCode || "SPAGESMENU",
              RequestedURL: url,
            },
            JMetaData: jMetaData,
            JData: jData,
          },
          Notes: dbapiPayload.Notes || "1",
          dbapiUrl: url, // Pass the original URL
        };

        headers = {
          "Content-Type": "application/json",
        };

        // Log what we're sending
        console.log("Frontend sending to /api/dbapi:", data);

        // Call backend proxy instead of DBAPI directly
        const response = await axios.post("/api/dbapi", data, {
          headers: headers,
          responseType: "json",
        });

        return response.data; // Backend returns { status, text, success }
      } else {
        // Format request for API Gateway (JSON)
        data = requestPayload;
        headers = {
          "Content-Type": "application/json",
        };

        const response = await axios.post(url, data, {
          headers: headers,
          responseType: "text",
        });

        return {
          status: `${response.status} ${response.statusText}`,
          text: response.data,
        };
      }
    } catch (error) {
      console.error(
        "Error details:",
        error.response ? error.response.data : error.message
      );
      let errMsg = error.response ? error.response.data : error.message;
      // Ensure errMsg is always a string
      if (typeof errMsg === 'object') {
        errMsg = JSON.stringify(errMsg, null, 2);
      }
      return {
        status: `${error.response?.status || "Error"}`,
        text: String(errMsg),
      };
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>DBAPI Test</h1>
      <div className={styles.lblLink}>
        <Link href="/flights">FlightView API</Link>
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
            Gateway API URL
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
            Gateway API Request Action Code
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
            Gateway API Request Payload
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
            Gateway API Response Status
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
              Gateway API Response
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

export default GatewayApiTest;
