import { useEffect, useRef, useState } from "react"
import { supabase } from "../lib/supabase"
import logo from "../assets/generali-logo.png"
import MyVehicleDashboard from "../components/MyVehicleDashboard"
import AdminFleetOverview from "../components/AdminFleetOverview"
import AdminReceiptsOverview from "../components/AdminReceiptsOverview"
import ChangePasswordPanel from "../pages/ChangePasswordPanel"
import AdminCostsOverview from "../components/AdminCostsOverview"

function DashboardPage() {
  const [profile, setProfile] = useState(null)
  const [vehicle, setVehicle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("my-vehicle")

  const isLoggingOutRef = useRef(false)
  const isMountedRef = useRef(true)

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
    return <div className="p-6 sm:p-10">Učitavanje...</div>
  }

  if (!profile) {
    return <div className="p-6 sm:p-10">Učitavanje...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-red-700 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
              <img
                src={logo}
                alt="Generali"
                className="w-12 sm:w-14 bg-white rounded-lg p-1.5 shrink-0"
              />

              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold leading-tight break-words">
                  {isAdmin
                    ? "Generali osiguranje Montenegro Admin"
                    : "Generali osiguranje Montenegro"}
                </h1>

                <p className="mt-1 text-sm sm:text-base text-red-100 leading-snug break-words">
                  {profile?.full_name}
                  {vehicle ? ` • ${vehicle.model} • ${vehicle.plate}` : ""}
                  {isAdmin && !vehicle ? " • Admin bez vozila" : ""}
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-3 shrink-0">
              <ChangePasswordPanel />

              <button
                type="button"
                onClick={handleLogout}
                className="bg-white text-red-700 px-4 py-2.5 rounded-xl font-medium"
              >
                Logout
              </button>
            </div>

            <div className="sm:hidden flex items-center">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full bg-white text-red-700 px-4 py-3 rounded-xl font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="sm:hidden max-w-7xl mx-auto px-4 pt-4">
        <ChangePasswordPanel mobile />
      </div>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {isAdmin ? (
          <>
            <div className="bg-white rounded-2xl shadow p-3 sm:p-2">
              <div className="flex flex-wrap gap-2">
                {hasVehicle && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("my-vehicle")}
                    className={`px-4 py-3 sm:py-2.5 rounded-xl font-medium transition ${
                      activeTab === "my-vehicle"
                        ? "bg-red-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Moj automobil
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab("fleet-overview")}
                  className={`px-4 py-3 sm:py-2.5 rounded-xl font-medium transition ${
                    activeTab === "fleet-overview"
                      ? "bg-red-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Pregled svih vozila
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("receipts-overview")}
                  className={`px-4 py-3 sm:py-2.5 rounded-xl font-medium transition ${
                    activeTab === "receipts-overview"
                      ? "bg-red-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Pregled unosa računa
                </button>
                <button
  type="button"
  onClick={() => setActiveTab("costs-overview")}
  className={`px-4 py-3 sm:py-2.5 rounded-xl font-medium transition ${
    activeTab === "costs-overview"
      ? "bg-red-600 text-white shadow-sm"
      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
  }`}
>
  Troškovi
</button>
              </div>
            </div>

            {activeTab === "my-vehicle" && hasVehicle && (
              <MyVehicleDashboard profile={profile} vehicle={vehicle} />
            )}

            {activeTab === "fleet-overview" && <AdminFleetOverview />}

            {activeTab === "receipts-overview" && <AdminReceiptsOverview />}

            {activeTab === "costs-overview" && <AdminCostsOverview />}
          </>
        ) : (
          hasVehicle && <MyVehicleDashboard profile={profile} vehicle={vehicle} />
        )}
      </main>
    </div>
  )
}

export default DashboardPage