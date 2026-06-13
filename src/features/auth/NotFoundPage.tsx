import { Home } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="grid min-h-[70vh] place-items-center bg-night text-white">
      <div className="text-center">
        <h1 className="text-9xl font-extrabold text-cyan-400/20 tracking-widest">404</h1>
        <div className="bg-cyan-400 px-2 text-sm rounded rotate-12 absolute">
          Page Not Found
        </div>
        <div className="mt-8">
          <p className="text-xl text-slate-300 font-semibold md:text-3xl">Oops! We can't find that page.</p>
          <p className="mt-4 text-slate-500 mb-8">But Teja Assistant is still here for you.</p>
          <Link to="/" className="primary-button inline-flex">
            <Home className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
