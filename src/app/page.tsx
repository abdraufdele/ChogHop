import { Practice } from '../components/practice';
import { createRun, keeperView } from '../puzzle/engine';

export default function Home() {
  return <Practice initial={keeperView(createRun('last-lantern-01'))} />;
}
