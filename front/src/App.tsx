import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layout/AppLayout'
import { OverviewPage } from './pages/OverviewPage'
import { DriversPage } from './pages/DriversPage'
import { RidersPage } from './pages/RidersPage'
import { TripsPage } from './pages/TripsPage'
import { OffersPage } from './pages/OffersPage'
import { TelemetryPage } from './pages/TelemetryPage'

const App = () => {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/drivers" element={<DriversPage />} />
          <Route path="/riders" element={<RidersPage />} />
          <Route path="/trips" element={<TripsPage />} />
          <Route path="/offers" element={<OffersPage />} />
          <Route path="/telemetry" element={<TelemetryPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}

export default App
