import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Chat } from "./pages/Chat";
import { Settings } from "./pages/Settings";
import { Layout } from "./components/layout/Layout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Chat />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
