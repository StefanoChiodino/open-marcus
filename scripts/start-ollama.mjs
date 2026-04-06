import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { homedir, platform } from 'os';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

const isMacOS = platform() === 'darwin';
const isLinux = platform() === 'linux';

async function isOllamaInstalled() {
  try {
    await execAsync('which ollama');
    return true;
  } catch {
    return false;
  }
}

async function isOllamaRunning() {
  try {
    await execAsync('curl -s http://localhost:11434/api/version');
    return true;
  } catch {
    return false;
  }
}

function getOllamaAppPath() {
  if (isMacOS) {
    const appPath = '/Applications/Ollama.app/Contents/Resources/ollama';
    if (existsSync(appPath)) {
      return appPath;
    }
  }
  return null;
}

async function installOllamaMacOSApp() {
  if (!isMacOS) return false;

  const appPath = '/Applications/Ollama.app';
  if (existsSync(appPath)) {
    return true;
  }

  console.log('Installing Ollama for macOS...');
  console.log('Downloading Ollama...');

  const tempDir = await execAsync('mktemp -d');
  const tempPath = tempDir.stdout.trim();

  try {
    await execAsync(
      `curl -fsSL https://ollama.com/download/Ollama-darwin.zip -o "${tempPath}/ollama.zip"`
    );
    console.log('Extracting...');
    await execAsync(`unzip -q "${tempPath}/ollama.zip" -d "${tempPath}"`);
    await execAsync(`mv "${tempPath}/Ollama.app" "/Applications/"`);
    console.log('Ollama installed to /Applications');
    return true;
  } finally {
    await execAsync(`rm -rf "${tempPath}"`).catch(() => {});
  }
}

async function installOllamaCLI() {
  console.log('Installing Ollama CLI...');
  const { stdout, stderr } = await execAsync(
    'curl -fsSL https://ollama.com/install.sh | sh'
  );
  if (stdout) console.log(stdout);
  if (stderr && !stderr.includes('Password:')) console.log(stderr);
  console.log('Ollama installed successfully');
}

async function startOllamaBinary(binaryPath) {
  console.log(`Starting Ollama daemon from ${binaryPath}...`);
  spawn(binaryPath, ['serve'], { detached: true, stdio: 'ignore' }).unref();
}

async function startOllama() {
  console.log('Starting Ollama daemon...');
  spawn('ollama', ['serve'], { detached: true, stdio: 'ignore' }).unref();

  // Wait for Ollama to be ready
  let attempts = 0;
  while (attempts < 30) {
    if (await isOllamaRunning()) {
      console.log('Ollama daemon is ready');
      return;
    }
    await new Promise(r => setTimeout(r, 1000));
    attempts++;
  }
  throw new Error('Failed to start Ollama');
}

async function ensureModel() {
  const model = process.env.OLLAMA_MODEL || 'llama3.2:latest';
  console.log(`Ensuring model ${model} is available...`);
  try {
    await execAsync(`ollama pull ${model}`, { env: { ...process.env, OLLAMA_HIDE_PROGRESS: '1' } });
    console.log(`Model ${model} is ready`);
  } catch (e) {
    console.log(`Model ${model} check complete`);
  }
}

async function main() {
  if (!(await isOllamaInstalled())) {
    if (isMacOS) {
      const installed = await installOllamaMacOSApp();
      if (!installed) {
        await installOllamaCLI();
      }
    } else if (isLinux) {
      await installOllamaCLI();
    } else {
      console.error('Unsupported platform. Please install Ollama manually from https://ollama.com');
      return;
    }
  }

  if (!(await isOllamaRunning())) {
    const appBinary = getOllamaAppPath();
    if (appBinary) {
      await startOllamaBinary(appBinary);
    } else {
      await startOllama();
    }
  } else {
    console.log('Ollama daemon already running');
  }

  await ensureModel();
}

main().catch(console.error);
