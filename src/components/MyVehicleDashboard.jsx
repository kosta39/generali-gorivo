import { useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "../lib/supabase"

function MyVehicleDashboard({ profile, vehicle }) {
  const today = new Date()
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()
  const todayString = today.toISOString().split("T")[0]

  const fileInputRef = useRef(null)

  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedYear, setSelectedYear] = useState(currentYear)

  const [kmStart, setKmStart] = useState("")
  const [kmEnd, setKmEnd] = useState("")

  const [fuelDate, setFuelDate] = useState(todayString)
  const [liters, setLiters] = useState("")
  const [pricePerLiter, setPricePerLiter] = useState("")
  const [paymentType, setPaymentType] = useState("company")
  const [receiptFile, setReceiptFile] = useState(null)

  const [editingFuelEntryId, setEditingFuelEntryId] = useState(null)
  const [existingReceiptPath, setExistingReceiptPath] = useState(null)

  const [monthlyRows, setMonthlyRows] = useState([])
  const [fuelEntries, setFuelEntries] = useState([])

  const [fuelYtdValue, setFuelYtdValue] = useState(0)
  const [avgFuelYtd, setAvgFuelYtd] = useState(0)
  const [avgConsumptionYtd, setAvgConsumptionYtd] = useState(0)

  const shouldIgnoreFetchError = (error) => {
    return String(error?.message || "").includes("Failed to fetch")
  }

  useEffect(() => {
    if (vehicle?.id) {
      loadMonthData()
      loadYearData()
    }
  }, [vehicle?.id, selectedMonth, selectedYear])

  

  const loadMonthData = async () => {
    const { data: kmData, error: kmError } = await supabase
      .from("monthly_km")
      .select("*")
      .eq("vehicle_id", vehicle.id)
      .eq("year", selectedYear)
      .eq("month", selectedMonth)
      .maybeSingle()

    if (kmError) {
      console.error("monthly_km error:", kmError)

      if (!shouldIgnoreFetchError(kmError)) {
        alert("Greška monthly_km query: " + kmError.message)
      }

      return
    }

    setKmStart(kmData?.km_start?.toString() || "")
    setKmEnd(kmData?.km_end?.toString() || "")

    const monthStart = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`
    const nextMonthDate =
      selectedMonth === 12
        ? `${selectedYear + 1}-01-01`
        : `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`

    const { data: monthFuelData, error: fuelError } = await supabase
      .from("fuel_entries")
      .select("*")
      .eq("vehicle_id", vehicle.id)
      .gte("fuel_date", monthStart)
      .lt("fuel_date", nextMonthDate)
      .order("fuel_date", { ascending: false })

    if (fuelError) {
      console.error("fuel_entries error:", fuelError)

      if (!shouldIgnoreFetchError(fuelError)) {
        alert("Greška fuel_entries query: " + fuelError.message)
      }

      return
    }

    setFuelEntries(monthFuelData || [])
  }

  const loadYearData = async () => {
    const { data: kmRows, error } = await supabase
      .from("monthly_km")
      .select("*")
      .eq("vehicle_id", vehicle.id)
      .eq("year", selectedYear)
      .lte("month", selectedMonth)
      .order("month", { ascending: true })

    if (error) {
      console.error("loadYearData error:", error)

      if (!shouldIgnoreFetchError(error)) {
        alert("Greška loadYearData query: " + error.message)
      }

      return
    }

    setMonthlyRows(kmRows || [])
  }

  const resetFuelForm = () => {
    setFuelDate(todayString)
    setLiters("")
    setPricePerLiter("")
    setPaymentType("company")
    setReceiptFile(null)
    setEditingFuelEntryId(null)
    setExistingReceiptPath(null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleEditFuelEntry = (entry) => {
    setEditingFuelEntryId(entry.id)
    setFuelDate(entry.fuel_date || todayString)
    setLiters(String(entry.liters ?? ""))
    setPricePerLiter(String(entry.price_per_liter ?? ""))
    setPaymentType(entry.payment_type || "company")
    setReceiptFile(null)
    setExistingReceiptPath(entry.receipt_path || null)

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  const handleCancelEdit = () => {
    resetFuelForm()
  }

  const handleSaveKm = async (e) => {
    e.preventDefault()

    if (kmStart === "" || kmEnd === "") {
      alert("Unesite početnu i završnu kilometražu.")
      return
    }

    const startValue = Number(kmStart)
    const endValue = Number(kmEnd)

    if (Number.isNaN(startValue) || Number.isNaN(endValue)) {
      alert("Kilometraža mora biti broj.")
      return
    }

    if (endValue < startValue) {
      alert("Završna kilometraža ne može biti manja od početne.")
      return
    }

    const { error } = await supabase.from("monthly_km").upsert(
      {
        vehicle_id: vehicle.id,
        year: selectedYear,
        month: selectedMonth,
        km_start: startValue,
        km_end: endValue,
      },
      { onConflict: "vehicle_id,year,month" }
    )

    if (error) {
      alert("Greška pri čuvanju kilometraže: " + error.message)
      return
    }

    alert("Kilometraža je sačuvana.")
    loadMonthData()
    loadYearData()
  }

  const handleAddFuel = async (e) => {
    e.preventDefault()

    if (!fuelDate) {
      alert("Izaberite datum.")
      return
    }

    if (!liters) {
      alert("Unesite litre.")
      return
    }

    if (!pricePerLiter) {
      alert("Unesite cijenu po litru.")
      return
    }

    const litersValue = Number(liters)
    const pricePerLiterValue = Number(pricePerLiter)

    if (Number.isNaN(litersValue) || litersValue <= 0) {
      alert("Litri mora biti pozitivan broj.")
      return
    }

    if (Number.isNaN(pricePerLiterValue) || pricePerLiterValue <= 0) {
      alert("Cijena po litru mora biti pozitivan broj.")
      return
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      alert("Korisnik nije prijavljen.")
      return
    }

    let receiptPath = existingReceiptPath || null

    if (receiptFile) {
      const fileExt = receiptFile.name.split(".").pop()
      const safeExt = fileExt ? fileExt.toLowerCase() : "jpg"
      const fileName = `${session.user.id}-${Date.now()}.${safeExt}`
      const filePath = `receipts/${session.user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from("fuel-receipts")
        .upload(filePath, receiptFile)

      if (uploadError) {
        alert("Greška pri uploadu računa: " + uploadError.message)
        return
      }

      receiptPath = filePath
    }

    const payload = {
      fuel_date: fuelDate,
      liters: litersValue,
      price_per_liter: pricePerLiterValue,
      total_price: totalPrice,
      payment_type: paymentType,
      receipt_path: receiptPath,
    }

    if (editingFuelEntryId) {
      const oldReceiptPath = existingReceiptPath || null

      const { error } = await supabase
        .from("fuel_entries")
        .update(payload)
        .eq("id", editingFuelEntryId)

      if (error) {
        alert("Greška pri izmjeni unosa goriva: " + error.message)
        return
      }

      if (receiptFile && oldReceiptPath && oldReceiptPath !== receiptPath) {
        const { error: storageDeleteError } = await supabase.storage
          .from("fuel-receipts")
          .remove([oldReceiptPath])

        if (storageDeleteError) {
          console.error("Greška pri brisanju stare slike računa:", storageDeleteError)
        }
      }

      alert("Unos goriva je izmijenjen.")
    } else {
      const { error } = await supabase.from("fuel_entries").insert({
        vehicle_id: vehicle.id,
        user_id: session.user.id,
        ...payload,
      })

      if (error) {
        alert("Greška pri unosu goriva: " + error.message)
        return
      }

      alert("Unos goriva je sačuvan.")
    }

    resetFuelForm()
    loadMonthData()
    loadYearData()
  }

  const handleDeleteFuelEntry = async (entry) => {
    const confirmed = window.confirm(
      "Da li ste sigurni da želite da obrišete ovaj unos goriva?"
    )

    if (!confirmed) {
      return
    }

    if (editingFuelEntryId === entry.id) {
      resetFuelForm()
    }

    const { error: deleteDbError } = await supabase
      .from("fuel_entries")
      .delete()
      .eq("id", entry.id)

    if (deleteDbError) {
      alert("Greška pri brisanju unosa goriva: " + deleteDbError.message)
      return
    }

    if (entry.receipt_path) {
      const { error: deleteStorageError } = await supabase.storage
        .from("fuel-receipts")
        .remove([entry.receipt_path])

      if (deleteStorageError) {
        console.error("Greška pri brisanju slike računa:", deleteStorageError)
      }
    }

    alert("Unos goriva je obrisan.")
    loadMonthData()
    loadYearData()
  }

  const handleRemoveReceiptFromEntry = async (entry) => {
    if (!entry.receipt_path) {
      return
    }

    const confirmed = window.confirm(
      "Da li ste sigurni da želite da obrišete račun sa ovog unosa?"
    )

    if (!confirmed) {
      return
    }

    const { error: updateError } = await supabase
      .from("fuel_entries")
      .update({ receipt_path: null })
      .eq("id", entry.id)

    if (updateError) {
      alert("Greška pri uklanjanju računa: " + updateError.message)
      return
    }

    const { error: storageError } = await supabase.storage
      .from("fuel-receipts")
      .remove([entry.receipt_path])

    if (storageError) {
      console.error("Greška pri brisanju slike računa:", storageError)
    }

    if (editingFuelEntryId === entry.id) {
      setExistingReceiptPath(null)
      setReceiptFile(null)

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }

    alert("Račun je obrisan.")
    loadMonthData()
  }

  const monthKm = useMemo(() => {
    const start = Number(kmStart)
    const end = Number(kmEnd)

    if (Number.isNaN(start) || Number.isNaN(end) || kmStart === "" || kmEnd === "") {
      return 0
    }

    return end - start
  }, [kmStart, kmEnd])

  const monthFuel = useMemo(() => {
    return fuelEntries.reduce((sum, entry) => sum + Number(entry.liters || 0), 0)
  }, [fuelEntries])

  const monthConsumption = useMemo(() => {
    if (monthKm <= 0) return 0
    return (monthFuel / monthKm) * 100
  }, [monthFuel, monthKm])

  const kmYtd = useMemo(() => {
    return monthlyRows.reduce((sum, row) => {
      const start = Number(row.km_start || 0)
      const end = Number(row.km_end || 0)
      return sum + Math.max(end - start, 0)
    }, 0)
  }, [monthlyRows])

  const activeKmMonths = useMemo(() => {
    return monthlyRows.filter((row) => {
      const start = Number(row.km_start || 0)
      const end = Number(row.km_end || 0)
      return end >= start && end - start > 0
    }).length
  }, [monthlyRows])

  const avgKmYtd = useMemo(() => {
    if (activeKmMonths === 0) return 0
    return kmYtd / activeKmMonths
  }, [kmYtd, activeKmMonths])

  const totalPrice = useMemo(() => {
    const l = Number(liters)
    const p = Number(pricePerLiter)

    if (Number.isNaN(l) || Number.isNaN(p)) return 0

    return l * p
  }, [liters, pricePerLiter])

  useEffect(() => {
    const calculateFuelYtd = async () => {
      if (!vehicle?.id) return

      const startOfYear = `${selectedYear}-01-01`
      const nextMonthDate =
        selectedMonth === 12
          ? `${selectedYear + 1}-01-01`
          : `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`

      const { data: ytdFuelRows, error } = await supabase
        .from("fuel_entries")
        .select("liters, fuel_date")
        .eq("vehicle_id", vehicle.id)
        .gte("fuel_date", startOfYear)
        .lt("fuel_date", nextMonthDate)

      if (error) {
        console.error("fuel YTD error:", error)

        if (!shouldIgnoreFetchError(error)) {
          alert("Greška fuel YTD query: " + error.message)
        }

        return
      }

      const totalFuel = (ytdFuelRows || []).reduce(
        (sum, row) => sum + Number(row.liters || 0),
        0
      )

      const monthlyFuelMap = new Map()

      ;(ytdFuelRows || []).forEach((row) => {
        const monthPart = String(row.fuel_date || "").split("-")[1]
        const monthNumber = Number(monthPart)

        if (!Number.isNaN(monthNumber)) {
          monthlyFuelMap.set(
            monthNumber,
            (monthlyFuelMap.get(monthNumber) || 0) + Number(row.liters || 0)
          )
        }
      })

      const fuelMonthsCount = monthlyFuelMap.size
      const avgFuel = fuelMonthsCount > 0 ? totalFuel / fuelMonthsCount : 0
      const avgConsumption = kmYtd > 0 ? (totalFuel / kmYtd) * 100 : 0

      setFuelYtdValue(totalFuel)
      setAvgFuelYtd(avgFuel)
      setAvgConsumptionYtd(avgConsumption)
    }

    calculateFuelYtd()
  }, [vehicle?.id, selectedYear, selectedMonth, kmYtd])

  const monthNames = [
    "Januar",
    "Februar",
    "Mart",
    "April",
    "Maj",
    "Jun",
    "Jul",
    "Avgust",
    "Septembar",
    "Oktobar",
    "Novembar",
    "Decembar",
  ]

  const getReceiptUrl = (receiptPath) => {
    if (!receiptPath) return null

    const { data } = supabase.storage
      .from("fuel-receipts")
      .getPublicUrl(receiptPath)

    return data?.publicUrl || null
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold mb-1">Moj automobil</h2>
        <p className="text-sm text-gray-500">
          {profile?.full_name} • {vehicle?.model} • {vehicle?.plate}
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">Izbor perioda</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Mjesec</label>
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {monthNames.map((name, index) => (
                <option key={index + 1} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Godina</label>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-bold mb-4">Kilometraža za mjesec</h2>

          <form onSubmit={handleSaveKm} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Početna kilometraža
              </label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2"
                value={kmStart}
                onChange={(e) => setKmStart(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Završna kilometraža
              </label>
              <input
                type="number"
                className="w-full border rounded-lg px-3 py-2"
                value={kmEnd}
                onChange={(e) => setKmEnd(e.target.value)}
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-3 font-medium">
              Pređeni kilometri za mjesec: {monthKm} km
            </div>

            <button className="w-full bg-red-600 text-white py-2.5 rounded-lg">
              Sačuvaj kilometražu
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">
              {editingFuelEntryId ? "Izmjena unosa goriva" : "Unos goriva"}
            </h2>

            {editingFuelEntryId && (
              <span className="text-sm text-amber-600 font-medium">Edit mode</span>
            )}
          </div>

          <form onSubmit={handleAddFuel} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Datum</label>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2"
                value={fuelDate}
                onChange={(e) => setFuelDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Litara</label>
              <input
                type="number"
                step="0.01"
                className="w-full border rounded-lg px-3 py-2"
                value={liters}
                onChange={(e) => setLiters(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Cijena po litru (€)
              </label>
              <input
                type="number"
                step="0.01"
                className="w-full border rounded-lg px-3 py-2"
                value={pricePerLiter}
                onChange={(e) => setPricePerLiter(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Način plaćanja
              </label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
              >
                <option value="company">Firmina kartica</option>
                <option value="private">Privatno</option>
              </select>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 font-medium">
              Ukupna cijena: {totalPrice.toFixed(2)} €
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Račun (slika)</label>
              <input
                ref={fileInputRef}
                id="fuel-receipt-file-input"
                type="file"
                accept="image/*"
                className="w-full border rounded-lg px-3 py-2"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              />
            </div>

            {existingReceiptPath && !receiptFile && (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3">
                <p className="text-sm text-gray-500">
                  Postojeći račun je sačuvan. Možete ostaviti ovako ili izabrati novu sliku.
                </p>

                {editingFuelEntryId && (
                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveReceiptFromEntry({
                        id: editingFuelEntryId,
                        receipt_path: existingReceiptPath,
                      })
                    }
                    className="text-sm text-red-600 underline whitespace-nowrap"
                  >
                    Obriši račun
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button className="flex-1 bg-red-600 text-white py-2.5 rounded-lg">
                {editingFuelEntryId ? "Sačuvaj izmjene" : "Dodaj unos goriva"}
              </button>

              {editingFuelEntryId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700"
                >
                  Otkaži
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow p-5">
          <p className="text-sm text-gray-500">Sipano za mjesec</p>
          <p className="text-2xl font-bold">{monthFuel.toFixed(2)} l</p>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <p className="text-sm text-gray-500">Pređeno za mjesec</p>
          <p className="text-2xl font-bold">{monthKm} km</p>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <p className="text-sm text-gray-500">Potrošnja za mjesec</p>
          <p className="text-2xl font-bold">{monthConsumption.toFixed(2)} l/100 km</p>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <p className="text-sm text-gray-500">Sipano od početka godine</p>
          <p className="text-2xl font-bold">{fuelYtdValue.toFixed(2)} l</p>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <p className="text-sm text-gray-500">Prosječno sipano do mjeseca</p>
          <p className="text-2xl font-bold">{avgFuelYtd.toFixed(2)} l</p>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <p className="text-sm text-gray-500">Pređeno od početka godine</p>
          <p className="text-2xl font-bold">{kmYtd} km</p>
        </div>

        <div className="bg-white rounded-2xl shadow p-5">
          <p className="text-sm text-gray-500">Prosjek pređenih km</p>
          <p className="text-2xl font-bold">{avgKmYtd.toFixed(0)} km</p>
        </div>

        <div className="bg-white rounded-2xl shadow p-5 lg:col-span-2">
          <p className="text-sm text-gray-500">
            Prosječna potrošnja na 100 km od početka godine
          </p>
          <p className="text-2xl font-bold">
            {avgConsumptionYtd.toFixed(2)} l/100 km
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">Unosi goriva za izabrani mjesec</h2>

        {fuelEntries.length === 0 ? (
          <p className="text-gray-500">Nema unosa za izabrani mjesec.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Datum</th>
                  <th className="text-left py-2">Litara</th>
                  <th className="text-left py-2">Cijena/l</th>
                  <th className="text-left py-2">Ukupno</th>
                  <th className="text-left py-2">Plaćanje</th>
                  <th className="text-left py-2">Račun</th>
                  <th className="text-left py-2">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {fuelEntries.map((entry) => {
                  const receiptUrl = getReceiptUrl(entry.receipt_path)

                  return (
                    <tr key={entry.id} className="border-b">
                      <td className="py-2">{entry.fuel_date}</td>
                      <td className="py-2">{Number(entry.liters || 0).toFixed(2)} l</td>
                      <td className="py-2">
                        {Number(entry.price_per_liter || 0).toFixed(2)} €
                      </td>
                      <td className="py-2">
                        {Number(entry.total_price || 0).toFixed(2)} €
                      </td>
                      <td className="py-2">
                        {entry.payment_type === "company" ? "Firma" : "Privatno"}
                      </td>
                      <td className="py-2">
                        {receiptUrl ? (
                          <div className="flex items-center gap-3">
                            <a
                              href={receiptUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-red-600 underline"
                            >
                              Pogledaj račun
                            </a>

                            <button
                              type="button"
                              onClick={() => handleRemoveReceiptFromEntry(entry)}
                              className="text-sm text-red-600 underline"
                            >
                              Obriši račun
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400">Nema računa</span>
                        )}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleEditFuelEntry(entry)}
                            className="text-blue-600 underline"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteFuelEntry(entry)}
                            className="text-red-600 underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default MyVehicleDashboard