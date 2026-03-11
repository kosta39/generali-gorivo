import { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "../lib/supabase"
import logo from "../assets/generali-logo.png"

function LoginPage() {
  const [activeTab, setActiveTab] = useState("login")

  const [loginUsername, setLoginUsername] = useState("")
  const [loginPassword, setLoginPassword] = useState("")

  const [fullName, setFullName] = useState("")
  const [registerUsername, setRegisterUsername] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [selectedModel, setSelectedModel] = useState("")
  const [selectedPlate, setSelectedPlate] = useState("")

  const [vehicles, setVehicles] = useState([])
  const [loadingVehicles, setLoadingVehicles] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const isMountedRef = useRef(true)

  const shouldIgnoreFetchError = (error) => {
    return (
      !isMountedRef.current ||
      String(error?.message || "").includes("Failed to fetch")
    )
  }

  useEffect(() => {
    isMountedRef.current = true
    fetchVehicles()

    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchVehicles = async () => {
    try {
      setLoadingVehicles(true)

      const { data, error } = await supabase
        .from("vehicles")
        .select("id, model, plate, is_assigned")
        .order("model", { ascending: true })
        .order("plate", { ascending: true })

      if (!isMountedRef.current) {
        return
      }

      if (error) {
        console.error("LOGIN VEHICLES ERROR:", error)

        if (!shouldIgnoreFetchError(error)) {
          alert("Greška pri učitavanju vozila: " + error.message)
        }

        return
      }

      setVehicles(data || [])
    } catch (err) {
      console.error("FETCH VEHICLES CATCH:", err)

      if (!shouldIgnoreFetchError(err)) {
        alert("Greška pri učitavanju vozila: " + err.message)
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingVehicles(false)
      }
    }
  }

  const availableVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => !vehicle.is_assigned)
  }, [vehicles])

  const models = useMemo(() => {
    return [...new Set(availableVehicles.map((vehicle) => vehicle.model))]
  }, [availableVehicles])

  const platesForSelectedModel = useMemo(() => {
    return availableVehicles.filter((vehicle) => vehicle.model === selectedModel)
  }, [availableVehicles, selectedModel])

  const handleLogin = async (e) => {
    e.preventDefault()

    if (!loginUsername.trim()) {
      alert("Unesite username.")
      return
    }

    if (!loginPassword.trim()) {
      alert("Unesite lozinku.")
      return
    }

    setSubmitting(true)

    const email = `${loginUsername.trim()}@generali.me`

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: loginPassword,
    })

    setSubmitting(false)

    if (error) {
      alert(error.message)
      return
    }

    window.location.href = "/"
  }

  const handleRegister = async (e) => {
    e.preventDefault()

    if (!fullName.trim()) {
      alert("Unesite ime i prezime.")
      return
    }

    if (!registerUsername.trim()) {
      alert("Unesite username.")
      return
    }

    if (!registerPassword.trim()) {
      alert("Unesite lozinku.")
      return
    }

    if (!selectedModel) {
      alert("Izaberite model auta.")
      return
    }

    if (!selectedPlate) {
      alert("Izaberite tablicu.")
      return
    }

    const selectedVehicle = availableVehicles.find(
      (vehicle) =>
        vehicle.model === selectedModel && vehicle.plate === selectedPlate
    )

    if (!selectedVehicle) {
      alert("Izabrano vozilo nije dostupno.")
      return
    }

    setSubmitting(true)

    const email = `${registerUsername.trim()}@generali.me`

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: registerPassword,
    })

    if (signUpError) {
      setSubmitting(false)
      alert(signUpError.message)
      return
    }

    const userId = signUpData?.user?.id

    if (!userId) {
      setSubmitting(false)
      alert("Korisnik nije kreiran.")
      return
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      full_name: fullName,
      username: registerUsername.trim(),
      email,
      role: "user",
      vehicle_id: selectedVehicle.id,
    })

    if (profileError) {
      setSubmitting(false)
      alert("Korisnik je kreiran, ali profil nije sačuvan: " + profileError.message)
      return
    }

    const { error: vehicleError } = await supabase
      .from("vehicles")
      .update({ is_assigned: true })
      .eq("id", selectedVehicle.id)

    setSubmitting(false)

    if (vehicleError) {
      alert(
        "Profil je sačuvan, ali vozilo nije označeno kao dodijeljeno: " +
          vehicleError.message
      )
      return
    }

    alert("Registracija uspješna. Sada se možete prijaviti.")

    setFullName("")
    setRegisterUsername("")
    setRegisterPassword("")
    setSelectedModel("")
    setSelectedPlate("")
    setActiveTab("login")

    fetchVehicles()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-700 via-red-600 to-red-800 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img
            src={logo}
            alt="Generali"
            className="w-28 mb-4 rounded-md bg-white p-2"
          />
          <h1 className="text-3xl font-bold text-white text-center">
            Generali Montenegro
          </h1>
          <p className="text-red-100 mt-2 text-center">
            Evidencija goriva i mjesečni izvještaji
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="grid grid-cols-2">
            <button
              type="button"
              onClick={() => setActiveTab("login")}
              className={`py-4 text-sm font-semibold transition ${
                activeTab === "login"
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("register")}
              className={`py-4 text-sm font-semibold transition ${
                activeTab === "register"
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Register
            </button>
          </div>

          <div className="p-8">
            {activeTab === "login" ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    placeholder="Unesite username"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lozinka
                  </label>
                  <input
                    type="password"
                    placeholder="Unesite lozinku"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-70"
                >
                  {submitting ? "Molimo sačekajte..." : "Login"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ime i prezime
                  </label>
                  <input
                    type="text"
                    placeholder="Unesite ime i prezime"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    placeholder="npr. imeprezime"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lozinka
                  </label>
                  <input
                    type="password"
                    placeholder="Unesite lozinku"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model auta
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={selectedModel}
                    onChange={(e) => {
                      setSelectedModel(e.target.value)
                      setSelectedPlate("")
                    }}
                    disabled={loadingVehicles}
                  >
                    <option value="">Izaberite model</option>
                    {models.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tablica
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={selectedPlate}
                    onChange={(e) => setSelectedPlate(e.target.value)}
                    disabled={!selectedModel || loadingVehicles}
                  >
                    <option value="">Izaberite tablicu</option>
                    {platesForSelectedModel.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.plate}>
                        {vehicle.plate}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submitting || loadingVehicles}
                  className="w-full bg-red-600 text-white py-2.5 rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-70"
                >
                  {submitting ? "Molimo sačekajte..." : "Register"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage