/**
 * Shader program, corresponding to the GPU shader program.
 * @internal
 */
export class ShaderProgram {
  private static _counter: number = 0;

  private static _addLineNum(str: string) {
    const lines = str.split("\n");
    const limitLength = (lines.length + 1).toString().length + 6;
    let prefix;
    return lines
      .map((line, index) => {
        prefix = `0:${index + 1}`;
        if (prefix.length >= limitLength) return prefix.substring(0, limitLength) + line;

        for (let i = 0; i < limitLength - prefix.length; i++) prefix += " ";

        return prefix + line;
      })
      .join("\n");
  }

  id: number;
}
