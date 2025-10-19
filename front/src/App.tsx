import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layout/AppLayout'
import { OverviewPage } from './pages/OverviewPage'
import { DriversPage } from './pages/DriversPage'
import { RidersPage } from './pages/RidersPage'
import { TripsPage } from './pages/TripsPage'
import { OffersPage } from './pages/OffersPage'
import { TelemetryPage } from './pages/TelemetryPage'
import { DriverGeneratorPage } from './pages/DriverGeneratorPage'
import { TripGeneratorPage } from './pages/TripGeneratorPage'

const App = () => {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/drivers" element={<DriversPage />} />
          <Route path="/riders" element={<RidersPage />} />
          <Route path="/trips" element={<TripsPage />} />
          <Route path="/trips/generator" element={<TripGeneratorPage />} />
          <Route path="/offers" element={<OffersPage />} />
          <Route path="/telemetry" element={<TelemetryPage />} />
          <Route path="/drivers/generator" element={<DriverGeneratorPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  )
}

export default App
