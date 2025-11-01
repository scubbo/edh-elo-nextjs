import ColorPreferenceMockup from "@/components/ColorPreferenceMockup"

export default function ColorPreferenceDemoPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Color Preference Widget Mockup</h1>
        <p className="text-slate-600 mb-8">
          This is a visual mockup demonstrating the color preference statistics widget design.
          Navigate to: <code className="bg-slate-100 px-2 py-1 rounded">/demo-color-preference</code>
        </p>
        <ColorPreferenceMockup />
      </div>
    </div>
  )
}

