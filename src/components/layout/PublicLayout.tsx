import { Outlet } from 'react-router-dom';
import TopInfoBar from './TopInfoBar';
import Navbar from './Navbar';
import Footer from './Footer';

export default function PublicLayout() {
  return (
    <div className="public-layout">
      <TopInfoBar />
      <Navbar />
      <main className="public-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
