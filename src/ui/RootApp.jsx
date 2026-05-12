import {useState} from 'react'

// session is a state variable that we choose which window to be on with. 
// Home Window for no session
// If session exists, route to workwindow. 
// There will be no separate whiteboard only mode in this new implementation
export default function Root() {
  const [session, setSession] = useState(null);
  if (!session) {
    return (
      <HomeWindow
      />
    );
  }
  return <WorkWindow  />;
}
