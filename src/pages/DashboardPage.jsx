import { useEffect, useRef, useState } from "react"
import { supabase } from "../lib/supabase"
import logo from "../assets/generali-logo.png"
import MyVehicleDashboard from "../components/MyVehicleDashboard"
import AdminFleetOverview from "../components/AdminFleetOverview"
import AdminReceiptsOverview from "../components/AdminReceiptsOverview"
import ChangePasswordPanel from "../pages/ChangePasswordPanel"

function DashboardPage() {
  const [profile, setProfile] = useState(null)
  const [vehicle, setVehicle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("my-vehicle")

  const isLoggingOutRef = useRef(false)
  const isMountedRef = useRef(true)

  const shouldIgnoreFetchError = (error) => {
    return (
      isLoggingOutRef.current ||
      !isMountedRef.current ||
      String(error?.message || "").includes("Failed to fetch")
    )
  }

  useEffect(() => {
    isMountedRef.current = true
    checkUser()

    return () => {
      isMountedRef.current = false
    }
  }, [])

  const checkUser = async () => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!isMountedRef.current || isLoggingOutRef.current) {
      return
    }

    if (!session?.user) {
      setLoading(false)
      return
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, username, email, role, vehicle_id")
      .eq("id", session.user.id)
      .maybeSingle()

    if (!isMountedRef.current || isLoggingOutRef.current) {
      return
    }

    if (profileError) {
      console.error("PROFILE ERROR:", profileError)
      return
    }

    if (!profileData) {
      return
    }

    setProfile(profileData)

    if (profileData.vehicle_id) {
      const { data: vehicleData, error: vehicleError } = await supabase
        .from("vehicles")
        .select("id, model, plate")
        .eq("id", profileData.vehicle_id)
        .maybeSingle()

      if (!isMountedRef.current || isLoggingOutRef.current) {
        return
      }

      if (vehicleError) {
        console.error("VEHICLE ERROR:", vehicleError)
        return
      }

      setVehicle(vehicleData || null)

      if (profileData.role === "admin") {
        setActiveTab("my-vehicle")
      }
    } else {
      setVehicle(null)

      if (profileData.role === "admin") {
        setActiveTab("fleet-overview")
      }
    }
  } catch (err) {
    console.error("CHECK USER ERROR:", err)
  } finally {
    if (isMountedRef.current && !isLoggingOutRef.current) {
      setLoading(false)
    }
  }
}

  const handleLogout = async () => {
    isLoggingOutRef.current = true

    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error("LOGOUT ERROR:", err)
    } finally {
      window.location.replace("/")
    }
  }

  const isAdmin = profile?.role === "admin"
  const hasVehicle = !!vehicle

  if (loading) {
    return <div className="p-10">Učitavanje...</div>
  }

  if (!profile) {
    return <div className="p-10">Učitavanje...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-red-700 text-white px-6 py-4 shadow">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Generali" className="w-14 bg-white rounded p-1" />
            <div>
              <h1 className="text-xl font-bold">
                {isAdmin ? "Generali osiguranje Montenegro Admin" : "Generali osiguranje Montenegro"}
              </h1>
              <p className="text-sm text-red-100">
                {profile?.full_name}
                {vehicle ? ` • ${vehicle.model} • ${vehicle.plate}` : ""}
                {isAdmin && !vehicle ? " • Admin bez vozila" : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
  <ChangePasswordPanel />

  <button
    type="button"
    onClick={handleLogout}
    className="bg-white text-red-700 px-4 py-2 rounded-lg font-medium"
  >
    Logout
  </button>
</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {isAdmin ? (
          <>
            <div className="bg-white rounded-2xl shadow p-2">
              <div className="flex flex-wrap gap-2">
                {hasVehicle && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("my-vehicle")}
                    className={`px-4 py-2 rounded-xl font-medium transition ${
                      activeTab === "my-vehicle"
                        ? "bg-red-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Moj automobil
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab("fleet-overview")}
                  className={`px-4 py-2 rounded-xl font-medium transition ${
                    activeTab === "fleet-overview"
                      ? "bg-red-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Pregled svih vozila
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("receipts-overview")}
                  className={`px-4 py-2 rounded-xl font-medium transition ${
                    activeTab === "receipts-overview"
                      ? "bg-red-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Pregled unosa računa
                </button>
              </div>
            </div>

            {activeTab === "my-vehicle" && hasVehicle && (
              <MyVehicleDashboard profile={profile} vehicle={vehicle} />
            )}

            {activeTab === "fleet-overview" && <AdminFleetOverview />}

            {activeTab === "receipts-overview" && <AdminReceiptsOverview />}
          </>
        ) : (
          hasVehicle && <MyVehicleDashboard profile={profile} vehicle={vehicle} />
        )}
      </main>
    </div>
  )
}

export default DashboardPage