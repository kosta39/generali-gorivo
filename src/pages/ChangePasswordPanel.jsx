import { useState } from "react"
import { supabase } from "../lib/supabase"

function ChangePasswordPanel({ mobile = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
  }

  const closeModal = () => {
    resetForm()
    setIsOpen(false)
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()

    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("Popunite sva polja.")
      return
    }

    if (newPassword.length < 6) {
      alert("Nova lozinka mora imati najmanje 6 karaktera.")
      return
    }

    if (newPassword !== confirmPassword) {
      alert("Nova lozinka i potvrda lozinke se ne poklapaju.")
      return
    }

    setSaving(true)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        alert("Korisnik nije prijavljen.")
        return
      }

      if (!user.email) {
        alert("Email korisnika nije dostupan.")
        return
      }

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })

      if (reauthError) {
        alert("Stara lozinka nije ispravna.")
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        alert("Greška pri promjeni lozinke: " + updateError.message)
        return
      }

      alert("Lozinka je uspješno promijenjena.")
      closeModal()
    } catch (err) {
      alert("Greška pri promjeni lozinke: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          mobile
            ? "w-full bg-red-600 text-white px-4 py-3 rounded-lg font-medium"
            : "bg-white text-red-700 px-4 py-2 rounded-lg font-medium"
        }
      >
        Promijeni lozinku
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5">
            <h3 className="text-lg font-bold mb-4 text-gray-900">Promjena lozinke</h3>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Stara lozinka
                </label>
                <input
                  type="password"
                  className="w-full border rounded-lg px-3 py-2 text-gray-900"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Nova lozinka
                </label>
                <input
                  type="password"
                  className="w-full border rounded-lg px-3 py-2 text-gray-900"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Potvrdi novu lozinku
                </label>
                <input
                  type="password"
                  className="w-full border rounded-lg px-3 py-2 text-gray-900"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-60"
                >
                  {saving ? "Čuvanje..." : "Sačuvaj"}
                </button>

                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700"
                >
                  Otkaži
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default ChangePasswordPanel