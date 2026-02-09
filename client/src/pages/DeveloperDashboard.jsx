import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function DeveloperDashboard() {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState("analytics");

  // ✅ Check token on mount and when it changes
  useEffect(() => {
    const devToken = localStorage.getItem("developerToken");
    if (!devToken) {
      // ✅ Redirect to dev login if no token
      navigate("/dev/login", { replace: true });
      return;
    }
    setToken(devToken);
    setIsReady(true);
  }, [navigate]);

  // Analytics state
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Schools list state
  const [schools, setSchools] = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);

  // Create school state
  const [schoolName, setSchoolName] = useState("");
  const [creatingSchool, setCreatingSchool] = useState(false);
  const [schoolMessage, setSchoolMessage] = useState("");

  // Create user state
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("TEACHER");
  const [userClass, setUserClass] = useState("");
  const [userSection, setUserSection] = useState("");
  const [userSubject, setUserSubject] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [createdUserCreds, setCreatedUserCreds] = useState(null);

  // Fetch analytics
  useEffect(() => {
    if (activeTab === "analytics" && isReady && token) {
      fetchAnalytics();
    }
  }, [activeTab, isReady, token]);

  // Fetch schools
  useEffect(() => {
    if (activeTab === "schools" && isReady && token) {
      fetchSchools();
    }
  }, [activeTab, isReady, token]);

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const res = await fetch("http://localhost:5000/api/dev/analytics", {
        method: "GET",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });
      
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error("ANALYTICS ERROR:", err);
      setAnalytics(null); // ✅ Clear state on error
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      setSchoolsLoading(true);
      const res = await fetch("http://localhost:5000/api/dev/schools", {
        method: "GET",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });
      
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      
      const data = await res.json();
      const schoolList = Array.isArray(data) ? data : data.value || [];
      setSchools(schoolList);
      
      // ✅ Auto-select first school if available
      if (schoolList.length > 0 && !selectedSchoolId) {
        setSelectedSchoolId(schoolList[0]._id);
      }
    } catch (err) {
      console.error("SCHOOLS ERROR:", err);
      setSchools([]); // ✅ Clear state on error
    } finally {
      setSchoolsLoading(false);
    }
  };

  const handleCreateSchool = async (e) => {
    e.preventDefault();
    
    if (!schoolName.trim()) {
      setSchoolMessage("❌ School name required");
      return;
    }

    try {
      setCreatingSchool(true);
      setSchoolMessage("");
      
      const res = await fetch("http://localhost:5000/api/dev/schools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ name: schoolName.trim() }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setSchoolMessage(`❌ ${data.error || "Failed to create school"}`);
        return;
      }
      
      setSchoolMessage(
        `✅ School "${data.school.name}" created!\nAdmin: ${data.admin.email}\nPassword: ${data.admin.password}`
      );
      setSchoolName("");
      
      // ✅ Refresh schools list after creation
      setTimeout(() => {
        fetchSchools();
      }, 500);
    } catch (err) {
      console.error("CREATE SCHOOL ERROR:", err);
      setSchoolMessage("❌ Network error while creating school");
    } finally {
      setCreatingSchool(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    if (!userName.trim() || !userEmail.trim()) {
      setUserMessage("❌ Name and email required");
      return;
    }
    
    // ✅ Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail.trim())) {
      setUserMessage("❌ Invalid email format");
      return;
    }
    
    if (!selectedSchoolId) {
      setUserMessage("❌ School selection required");
      return;
    }

    try {
      setCreatingUser(true);
      setUserMessage("");
      setCreatedUserCreds(null);

      const payload = {
        schoolId: selectedSchoolId,
        name: userName.trim(),
        email: userEmail.trim(),
        role: userRole,
        password: userPassword || `${userRole.toLowerCase()}123`,
      };

      // ✅ Only add role-specific fields if provided
      if (userRole === "TEACHER") {
        if (userClass) payload.className = userClass;
        if (userSubject) payload.subject = userSubject;
        if (userSection) payload.section = userSection;
      } else if (userRole === "STUDENT") {
        if (userClass) payload.className = userClass;
        if (userSection) payload.section = userSection;
      }

      const res = await fetch("http://localhost:5000/api/dev/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setUserMessage(`❌ ${data.error || "Failed to create user"}`);
        return;
      }
      
      setCreatedUserCreds(data.user || { email: userEmail, password: payload.password });
      setUserMessage(`✅ ${userRole} created successfully!`);
      
      // ✅ Reset form
      setUserName("");
      setUserEmail("");
      setUserClass("");
      setUserSection("");
      setUserSubject("");
      setUserPassword("");
    } catch (err) {
      console.error("CREATE USER ERROR:", err);
      setUserMessage("❌ Network error while creating user");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (token) {
        const res = await fetch("http://localhost:5000/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });
        
        if (!res.ok) {
          console.warn("❌ Logout warning - server returned error");
        }
      }
      console.log("✅ Logged out successfully");
    } catch (err) {
      console.error("❌ Logout error:", err);
      // Continue with logout even if API fails
    } finally {
      localStorage.removeItem("developerToken");
      setToken(null);
      setIsReady(false);
      navigate("/", { replace: true });
    }
  };

  const schoolTabOptions = [
    { id: "analytics", label: "Analytics" },
    { id: "schools", label: "Schools" },
    { id: "create-school", label: "Create School" },
    { id: "create-user", label: "Create User" },
  ];

  const styles = {
    layout: {
      display: "flex",
      minHeight: "100vh",
      backgroundColor: "#f5f7fa",
    },
    sidebar: {
      width: 250,
      backgroundColor: "#1e293b",
      color: "white",
      padding: "20px",
      overflowY: "auto",
      boxShadow: "2px 0 8px rgba(0,0,0,0.1)",
    },
    logo: {
      fontSize: "20px",
      fontWeight: "bold",
      marginBottom: "30px",
      color: "#60a5fa",
    },
    navItems: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      marginBottom: "30px",
    },
    navBtn: (isActive) => ({
      padding: "12px 16px",
      border: "none",
      backgroundColor: isActive ? "#3b82f6" : "transparent",
      color: "white",
      cursor: "pointer",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: isActive ? "600" : "400",
      transition: "all 0.2s",
      textAlign: "left",
    }),
    logoutBtn: {
      padding: "12px 16px",
      border: "none",
      backgroundColor: "#dc2626",
      color: "white",
      cursor: "pointer",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: "500",
      width: "100%",
      marginTop: "auto",
    },
    pageMain: {
      flex: 1,
      padding: "30px",
      overflowY: "auto",
    },
    title: {
      fontSize: "28px",
      fontWeight: "bold",
      color: "#1e293b",
      marginBottom: "10px",
    },
    subtitle: {
      fontSize: "14px",
      color: "#64748b",
      marginBottom: "20px",
    },
    card: {
      backgroundColor: "white",
      padding: "20px",
      borderRadius: "8px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      marginBottom: "20px",
    },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "20px",
      marginBottom: "20px",
    },
    statCard: {
      backgroundColor: "white",
      padding: "20px",
      borderRadius: "8px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      textAlign: "center",
    },
    statNumber: {
      fontSize: "32px",
      fontWeight: "bold",
      color: "#3b82f6",
      marginBottom: "8px",
    },
    statLabel: {
      fontSize: "14px",
      color: "#64748b",
    },
    form: {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
    },
    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
    },
    label: {
      fontSize: "14px",
      fontWeight: "500",
      color: "#334155",
    },
    input: {
      padding: "10px 12px",
      border: "1px solid #cbd5e1",
      borderRadius: "6px",
      fontSize: "14px",
      fontFamily: "inherit",
    },
    select: {
      padding: "10px 12px",
      border: "1px solid #cbd5e1",
      borderRadius: "6px",
      fontSize: "14px",
      fontFamily: "inherit",
      backgroundColor: "white",
      cursor: "pointer",
    },
    button: {
      padding: "10px 20px",
      border: "none",
      backgroundColor: "#3b82f6",
      color: "white",
      cursor: "pointer",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: "500",
      transition: "all 0.2s",
    },
    buttonDisabled: {
      opacity: 0.6,
      cursor: "not-allowed",
    },
    message: (isError) => ({
      padding: "12px 16px",
      borderRadius: "6px",
      fontSize: "14px",
      backgroundColor: isError ? "#fee2e2" : "#dcfce7",
      color: isError ? "#991b1b" : "#166534",
      marginBottom: "16px",
      whiteSpace: "pre-wrap",
    }),
    schoolsList: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      gap: "16px",
    },
    schoolItem: {
      backgroundColor: "white",
      padding: "16px",
      borderRadius: "8px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    },
    schoolName: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#1e293b",
      marginBottom: "8px",
    },
    schoolMeta: {
      fontSize: "12px",
      color: "#64748b",
    },
    credsBox: {
      backgroundColor: "#f0fdf4",
      border: "1px solid #86efac",
      padding: "16px",
      borderRadius: "6px",
      marginTop: "12px",
    },
    credsLabel: {
      fontSize: "12px",
      fontWeight: "600",
      color: "#166534",
      marginBottom: "8px",
    },
    credsValue: {
      fontSize: "14px",
      fontFamily: "monospace",
      backgroundColor: "white",
      padding: "8px 12px",
      borderRadius: "4px",
      border: "1px solid #dcfce7",
      marginBottom: "8px",
      wordBreak: "break-all",
    },
  };

  if (!isReady || !token) {
    return (
      <div style={{ padding: "40px", textAlign: "center", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div>
          <h2>Loading...</h2>
          <p>Authenticating developer access...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.layout}>
      <div style={styles.sidebar}>
        <div style={styles.logo}>🚀 DevPanel</div>

        <div style={styles.navItems}>
          {schoolTabOptions.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={styles.navBtn(activeTab === item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button onClick={handleLogout} style={styles.logoutBtn}>
          Logout
        </button>
      </div>

      <div style={styles.pageMain}>
        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div>
            <h1 style={styles.title}>Platform Analytics</h1>
            <p style={styles.subtitle}>System-wide statistics</p>

            {analyticsLoading ? (
              <p>Loading...</p>
            ) : analytics ? (
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <div style={styles.statNumber}>{analytics.schools}</div>
                  <div style={styles.statLabel}>Schools</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statNumber}>{analytics.admins}</div>
                  <div style={styles.statLabel}>Admins</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statNumber}>{analytics.teachers}</div>
                  <div style={styles.statLabel}>Teachers</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statNumber}>{analytics.students}</div>
                  <div style={styles.statLabel}>Students</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statNumber}>{analytics.total}</div>
                  <div style={styles.statLabel}>Total Users</div>
                </div>
              </div>
            ) : (
              <p>No data available</p>
            )}
          </div>
        )}

        {/* Schools List Tab */}
        {activeTab === "schools" && (
          <div>
            <h1 style={styles.title}>All Schools</h1>
            <p style={styles.subtitle}>Manage schools across the platform</p>

            {schoolsLoading ? (
              <p>Loading...</p>
            ) : schools.length > 0 ? (
              <div style={styles.schoolsList}>
                {schools.map((school) => (
                  <div key={school._id} style={styles.schoolItem}>
                    <div style={styles.schoolName}>{school.name}</div>
                    <div style={styles.schoolMeta}>
                      ID: {school._id.substring(0, 12)}...
                    </div>
                    <div style={styles.schoolMeta}>
                      Created:{" "}
                      {new Date(school.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No schools found</p>
            )}
          </div>
        )}

        {/* Create School Tab */}
        {activeTab === "create-school" && (
          <div>
            <h1 style={styles.title}>Create School</h1>
            <p style={styles.subtitle}>Set up a new school and generate admin account</p>

            <div style={styles.card}>
              {schoolMessage && (
                <div style={styles.message(schoolMessage.startsWith("❌"))}>
                  {schoolMessage}
                </div>
              )}

              <form onSubmit={handleCreateSchool} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>School Name *</label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="e.g., Elite Academy"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    disabled={creatingSchool}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    ...styles.button,
                    ...(creatingSchool ? styles.buttonDisabled : {}),
                  }}
                  disabled={creatingSchool}
                >
                  {creatingSchool ? "Creating..." : "Create School"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Create User Tab */}
        {activeTab === "create-user" && (
          <div>
            <h1 style={styles.title}>Create User</h1>
            <p style={styles.subtitle}>Add admin, teacher, or student to a school</p>

            <div style={styles.card}>
              {userMessage && (
                <div style={styles.message(userMessage.startsWith("❌"))}>
                  {userMessage}
                </div>
              )}

              {createdUserCreds && (
                <div style={styles.credsBox}>
                  <div style={styles.credsLabel}>✓ User Created Successfully!</div>
                  <div>
                    <div style={styles.credsLabel}>Email:</div>
                    <div style={styles.credsValue}>{createdUserCreds.email}</div>
                  </div>
                  <div>
                    <div style={styles.credsLabel}>Password:</div>
                    <div style={styles.credsValue}>{createdUserCreds.password}</div>
                  </div>
                  <div style={styles.credsLabel} style={{ marginTop: "12px" }}>
                    Share these credentials with the user.
                  </div>
                </div>
              )}

              <form onSubmit={handleCreateUser} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>School *</label>
                  <select
                    style={styles.select}
                    value={selectedSchoolId}
                    onChange={(e) => setSelectedSchoolId(e.target.value)}
                    disabled={creatingUser || schools.length === 0}
                  >
                    <option value="">Select a school</option>
                    {schools.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Role *</label>
                  <select
                    style={styles.select}
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                    disabled={creatingUser}
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="TEACHER">Teacher</option>
                    <option value="STUDENT">Student</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Name *</label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="Full name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    disabled={creatingUser}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Email *</label>
                  <input
                    type="email"
                    style={styles.input}
                    placeholder="user@example.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    disabled={creatingUser}
                  />
                </div>

                {(userRole === "TEACHER" || userRole === "STUDENT") && (
                  <>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Class</label>
                      <input
                        type="text"
                        style={styles.input}
                        placeholder="e.g., 10"
                        value={userClass}
                        onChange={(e) => setUserClass(e.target.value)}
                        disabled={creatingUser}
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Section</label>
                      <input
                        type="text"
                        style={styles.input}
                        placeholder="e.g., A"
                        value={userSection}
                        onChange={(e) => setUserSection(e.target.value)}
                        disabled={creatingUser}
                      />
                    </div>
                  </>
                )}

                {userRole === "TEACHER" && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Subject</label>
                    <input
                      type="text"
                      style={styles.input}
                      placeholder="e.g., Mathematics"
                      value={userSubject}
                      onChange={(e) => setUserSubject(e.target.value)}
                      disabled={creatingUser}
                    />
                  </div>
                )}

                <div style={styles.formGroup}>
                  <label style={styles.label}>Password (optional)</label>
                  <input
                    type="password"
                    style={styles.input}
                    placeholder="Leave blank for default: user123"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    disabled={creatingUser}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    ...styles.button,
                    ...(creatingUser ? styles.buttonDisabled : {}),
                  }}
                  disabled={creatingUser || !selectedSchoolId}
                >
                  {creatingUser ? "Creating..." : "Create User"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
