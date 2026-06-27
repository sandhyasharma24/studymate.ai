import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { GlobalToasts } from './components/GlobalToasts';

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <GlobalToasts />
    </>
  );
}

export default App;
