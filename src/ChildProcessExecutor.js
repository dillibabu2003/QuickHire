import { spawn } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import path from 'path';

export default class ChildProcessExecutor {
  constructor(lang, code, input = '') {
    this.lang = lang;
    this.code = code.replace(/\\"/g, '"')  // Replace escaped double quotes
      .replace(/\\'/g, "'")  // Replace escaped single quotes
      .replace(/\\\\/g, '\\'); // Replace escaped backslashes
    this.input = input;
  }

  // Function to create and execute the child process
  createChildProcess() {
    return new Promise((resolve, reject) => {
      let child;
      let fileName;

      // Based on the language, spawn a process
      if (this.lang === 'js') {
        // Create a Node.js child process to run JavaScript code
        child = spawn('node', ['-e', this.code]);
      } else if (this.lang === 'python') {
        // Create a Python child process to run Python code
        child = spawn('python3', ['-c', this.code]);
      } else if (this.lang === 'java') {
        // Save the Java code to a temporary file
        fileName = './tmp/TempProgram'+this.roomId+'.java';
        writeFileSync(fileName, this.code);

        // Compile the Java code using javac
        child = spawn('javac', [fileName]);

        child.on('close', (code) => {
          if (code === 0) {
            // After successful compilation, run the Java program
            const javaChild = spawn('java', ['./tmp/TempProgram'+this.roomId]);
            let output = '';
            let error = '';

            javaChild.stdout.on('data', (data) => {
              output += data.toString();
            });

            javaChild.stderr.on('data', (data) => {
              error += data.toString();
            });

            javaChild.on('close', (exitCode) => {
              if (exitCode === 0) {
                resolve({
                  status: 'success',
                  output: output.trim(),
                  message: 'Java code executed successfully'
                });
              } else {
                reject({
                  status: 'error',
                  output: error.trim(),
                  message: 'Java code execution failed'
                });
              }
            });

            // Handle input if provided
            if (this.input) {
              javaChild.stdin.write(this.input);
              javaChild.stdin.end();
            }
          } else {
            reject({
              status: 'error',
              output: 'Java code compilation failed',
              message: 'Compilation error'
            });
          }
        });

        return;
      } else if (this.lang === 'cpp') {
        // Save the C++ code to a temporary file
        fileName = './tmp/TempProgram'+this.roomId+'.cpp';
        writeFileSync(fileName, this.code);

        // Compile the C++ code using g++
        child = spawn('g++', ['-o', './tmp/TempProgram'+this.roomId+'', fileName]);

        child.on('close', (code) => {
          if (code === 0) {
            // After successful compilation, run the C++ program
            const cppChild = spawn('./tmp/TempProgram'+this.roomId+'');
            let output = '';
            let error = '';

            cppChild.stdout.on('data', (data) => {
              output += data.toString();
            });

            cppChild.stderr.on('data', (data) => {
              error += data.toString();
            });

            cppChild.on('close', (exitCode) => {
              if (exitCode === 0) {
                resolve({
                  status: 'success',
                  output: output.trim(),
                  message: 'C++ code executed successfully'
                });
              } else {
                reject({
                  status: 'error',
                  output: error.trim(),
                  message: 'C++ code execution failed'
                });
              }
            });

            // Handle input if provided
            if (this.input) {
              cppChild.stdin.write(this.input);
              cppChild.stdin.end();
            }
          } else {
            reject({
              status: 'error',
              output: 'C++ code compilation failed',
              message: 'Compilation error'
            });
          }
        });

        return;
      } else {
        return reject({ status: 'error', output: '', message: 'Unsupported language!' });
      }

      let output = '';
      let error = '';

      // Handle output from stdout
      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      // Handle errors from stderr
      child.stderr.on('data', (data) => {
        error += data.toString();
      });

      // When the child process finishes
      child.on('close', (code) => {
        if (code === 0) {
          resolve({
            status: 'success',
            output: output.trim(),
            message: 'Code executed successfully'
          });
        } else {
          reject({
            status: 'error',
            output: error.trim(),
            message: 'Code execution failed'
          });
        }
      });

      // If there is input to provide to the process, we send it
      if (this.input) {
        child.stdin.write(this.input);
        child.stdin.end();
      }
    });
  }

  // A function to execute the code and handle the response
  async execute() {
    try {
      const result = await this.createChildProcess();
      return result;
    } catch (error) {
      return error;
    }
  }
}
// const javaCode = `
// import java.util.Scanner;

// public class TempProgram {
//   public static void main(String[] args) {
//     Scanner scanner = new Scanner(System.in);
//     String input = scanner.nextLine();
//     System.out.println("You entered: " + input);
//   }
// }`;

// const cppCode = `
// #include <iostream>
// using namespace std;

// int main() {
//   string input;
//   getline(cin,input);
//   cout << "You entered: " << input << endl;
//   return 0;
// }`;

// const langJava = 'java';
// const langCpp = 'cpp';
// const input = 'Hello from user input!';

// const javaExecutor = new ChildProcessExecutor(langJava, javaCode, input);
// const cppExecutor = new ChildProcessExecutor(langCpp, cppCode, input);

// javaExecutor.execute()
//   .then(result => console.log('Java Result:', result))
//   .catch(error => console.error('Java Error:', error));

// cppExecutor.execute()
//   .then(result => console.log('C++ Result:', result))
//   .catch(error => console.error('C++ Error:', error));

// Example usage:
// const code = "console.log('Hello from JS!')";
// const lang = 'js'; // Can be 'js' for JavaScript, 'python' for Python, etc.
// const input = '';

// const executor = new ChildProcessExecutor(lang, code, input);
// executor.execute()
//   .then(result => {
//     console.log('Result:', result);
//   })
//   .catch(error => {
//     console.error('Error:', error);
//   });

