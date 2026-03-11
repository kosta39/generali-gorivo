import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import logo from "../assets/generali-logo.png"
import MyVehicleDashboard from "../components/MyVehicleDashboard"
import AdminFleetOverview from "../components/AdminFleetOverview"

function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [vehicle, setVehicle] = useState(null)

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      window.location.href = "/"
      return
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, username, email, role, vehicle_id")
      .eq("id", session.user.id)
      .maybeSingle()

    if (profileError) {
      console.error("ADMIN PROFILE ERROR:", profileError)
      alert("Greška profiles query: " + profileError.message)
      return
    }

    if (!profileData || profileData.role !== "admin") {
      alert("Nemate pristup admin dijelu.")
      window.location.href = "/"
      return
    }

    setProfile(profileData)

    if (profileData.vehicle_id) {
      const { data: vehicleData, error: vehicleError } = await supabase
        .from("vehicles")
        .select("id, model, plate")
        .eq("id", profileData.vehicle_id)
        .maybeSingle()

      if (vehicleError) {
        console.error("ADMIN VEHICLE ERROR:", vehicleError)
        alert("Greška vehicles query: " + vehicleError.message)
        return
      }

      setVehicle(vehicleData || null)
    } else {
      setVehicle(null)
    }
  } catch (err) {
    console.error("CHECK ADMIN ERROR:", err)
    alert("Greška u admin provjeri: " + err.message)
  } finally {
    setLoading(false)
  }
}

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/"
  }

  if (loading) {
    return <div className="p-10">Učitavanje...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-red-700 text-white px-6 py-4 shadow">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Generali" className="w-14 bg-white rounded p-1" />
            <div>
              <h1 className="text-xl font-bold">Generali osiguranje Montenegro Admin</h1>
              <p className="text-sm text-red-100">
                {profile?.full_name}
                {vehicle ? ` • ${vehicle.model} • ${vehicle.plate}` : " • Admin bez vozila"}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="bg-white text-red-700 px-4 py-2 rounded-lg font-medium"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {vehicle && <MyVehicleDashboard profile={profile} vehicle={vehicle} />}

        <AdminFleetOverview />
      </main>
    </div>
  )
}

export default AdminDashboardPage