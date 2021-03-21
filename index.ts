import "./style.css";

const colors = [
  "red",
  "orange",
  "gold",
  "springGreen",
  "skyBlue",
  "magenta",
  "lightGray",
  "brown",
  "purple",
  "white"
];

function getElementById<T extends HTMLElement>(
  id: string,
  type: new (...args: any) => T
): T {
  const el = document.getElementById(id);
  if (el instanceof type) {
    return el;
  }
  throw new Error("Can't find element named " + id + " of type " + type.name);
}

const canvas = getElementById("canvas", HTMLDivElement);
const controlsForm = getElementById("controls", HTMLFormElement);
let timer: number = 0;
controlsForm.addEventListener("change", () => {
  if (timer) {
    clearTimeout(timer);
  }
  timer = setTimeout(drawHanoi, 1000);
});

const numPegsInput = getElementById("numPegs", HTMLInputElement);
const numDiscsInput = getElementById("numDiscs", HTMLInputElement);
const durationSecsInput = getElementById("durationSecs", HTMLInputElement);

function drawHanoi() {
  canvas.innerHTML = "";
  const numMovesDiv = document.createElement("div");
  numMovesDiv.id = "numMoves";
  canvas.appendChild(numMovesDiv);

  const numDiscs = Number(numDiscsInput.value);
  const numPegs = Number(numPegsInput.value);
  const secondsPerMove = Number(durationSecsInput.value);

  document.documentElement.style.setProperty("--num-pegs", String(numPegs));
  document.documentElement.style.setProperty("--num-discs", String(numDiscs));

  interface Stack {
    center: string;
    discs: HTMLDivElement[];
  }

  const stacks: Stack[] = [];

  for (let i = 0; i < numPegs; i++) {
    const center = ((45 / numPegs) * (2 * i + 1)).toFixed(3) + "vw";
    stacks[i] = { center, discs: [] };
    const stack = document.createElement("div");
    stack.classList.add("stack");
    const base = document.createElement("div");
    base.classList.add("base");
    const peg = document.createElement("div");
    peg.classList.add("peg");
    peg.style.height = "calc(var(--height) *" + (numDiscs + 1.5) + ")";
    stack.appendChild(peg);
    stack.appendChild(base);
    stack.style.setProperty("--center", center);
    canvas.appendChild(stack);
  }
  for (let i = numDiscs - 1; i >= 0; i--) {
    const disc = document.createElement("div");
    stacks[0].discs.push(disc);
    disc.dataset.id = String(i);
    disc.classList.add("disc");
    disc.style.setProperty(
      "--width",
      "calc(85vw / var(--num-pegs) * " +
        ((i + 3) / (numDiscs + 3)).toFixed(3) +
        ")"
    );

    disc.style.setProperty("--center", stacks[0].center);
    disc.style.setProperty("--position", String(numDiscs - i));
    disc.style.transitionDuration = secondsPerMove / 3 + "s";
    disc.style.backgroundImage =
      "linear-gradient(to bottom right, white -30%, " +
      colors[i % colors.length] +
      ", black 130%)";
    disc.innerText = String(i + 1);
    canvas.appendChild(disc);
  }

  function sleep(sec = 0) {
    return new Promise(r => setTimeout(() => r(), 1000 * sec));
  }
  async function move(from: Stack, to: Stack) {
    const disc = from.discs.pop();
    if (!disc) return; // can't happen
    to.discs.push(disc);
    await sleep();
    disc.style.setProperty("--position", String(numDiscs + 3));
    await sleep(secondsPerMove / 3);
    disc.style.setProperty("--center", to.center);
    await sleep(secondsPerMove / 3);
    disc.style.setProperty("--position", String(to.discs.length));
    await sleep(secondsPerMove / 3);
    numMovesCur++;
    numMovesDiv.innerHTML = numMovesCur.toLocaleString() + " of " + numMovesTot;
  }

  interface Move {
    from: number;
    to: number;
  }

  interface ChunkAtAndMoves {
    chunkAt: number;
    moves: number;
  }
  function getChunkSizeAndMoveNumbers(
    numDiscs: number,
    numPegs: number
  ): ChunkAtAndMoves {
    const key = numDiscs + "," + numPegs;
    let ret = getChunkSizeAndMoveNumbers.cache.get(key);
    if (!ret) {
      if (numDiscs < numPegs) {
        ret = {
          chunkAt: 1,
          moves: 2 * numDiscs - 1
        };
      } else if (numPegs < 3) {
        ret = {
          chunkAt: 1,
          moves: Infinity
        };
      } else {
        ret = {
          chunkAt: 0,
          moves: Infinity
        };
        for (let chunkAt = 1; chunkAt < numDiscs; chunkAt++) {
          let moves =
            2 * getChunkSizeAndMoveNumbers(chunkAt, numPegs).moves +
            getChunkSizeAndMoveNumbers(numDiscs - chunkAt, numPegs - 1).moves;
          if (moves < ret.moves) {
            ret = { chunkAt, moves };
          }
        }
      }
      getChunkSizeAndMoveNumbers.cache.set(key, ret);
    }
    return ret;
  }
  getChunkSizeAndMoveNumbers.cache = new Map<string, ChunkAtAndMoves>();

  function hanoiMoves(
    num: number,
    from: number,
    to: number,
    others: number[]
  ): Move[] {
    if (num <= 1) {
      return [{ from, to }];
    }

    const [temp, ...allOthers] = others;
    const { chunkAt } = getChunkSizeAndMoveNumbers(num, others.length + 2);
    return hanoiMoves(chunkAt, from, temp, [to, ...allOthers])
      .concat(hanoiMoves(num - chunkAt, from, to, allOthers))
      .concat(hanoiMoves(chunkAt, temp, to, [...allOthers, from]));
  }

  const stackNums = Object.keys(stacks).map(k => +k);
  const from = stackNums.shift();
  const to = stackNums.pop();
  if (typeof from === "undefined" || typeof to === "undefined")
    throw new Error("come on");

  let animPromise: Promise<void> = Promise.resolve();

  const moves = hanoiMoves(
    numDiscs > 20 && numPegs === 3 ? 20 : numDiscs,
    from,
    to,
    stackNums
  );
  let numMovesCur = 0;

  let totalNumMoves = getChunkSizeAndMoveNumbers(numDiscs, numPegs).moves;

  let numMovesTot =
    totalNumMoves > 1e4
      ? totalNumMoves
          .toExponential(2)
          .replace(/e\+(.*)$/, "&times;10<sup>$1</sup>")
      : totalNumMoves.toLocaleString();

  for (let theMove of moves) {
    animPromise = animPromise.then(_ =>
      move(stacks[theMove.from], stacks[theMove.to])
    );
  }
}

drawHanoi();
