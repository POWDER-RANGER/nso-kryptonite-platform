import { Routes, Route } from 'react-router';
import { Layout } from '@/components/layout/Layout';
import { WarRoom } from '@/pages/WarRoom';
import { ExerciseSetup } from '@/pages/ExerciseSetup';
import { DebriefRoom } from '@/pages/DebriefRoom';
import { Settings } from '@/pages/Settings';
import { NotFound } from '@/pages/NotFound';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<WarRoom />} />
        <Route path="/exercise" element={<ExerciseSetup />} />
        <Route path="/debrief" element={<DebriefRoom />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
