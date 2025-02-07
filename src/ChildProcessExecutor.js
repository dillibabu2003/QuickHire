import { spawn } from 'child_process';
import { mkdirSync,unlinkSync, writeFileSync } from 'fs';

export default class ChildProcessExecutor {
  constructor(lang, code, input = '', roomId,timeout = 5000) {  // Added timeout parameter (default: 5000 ms)
    this.lang = lang;
    this.code = code.replace(/\\"/g, '"')  // Replace escaped double quotes
      .replace(/\\'/g, "'")  // Replace escaped single quotes
      .replace(/\\\\/g, '\\'); // Replace escaped backslashes
    this.input = input;
    this.roomId=roomId;
    this.timeout = timeout;  // Timeout in milliseconds
  }

   // Ensure the temporary directory exists
   ensureTempDirectoryExists() {
    const dirPath = './tmp';
    try {
      mkdirSync(dirPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create tmp directory:', error);
    }
  }
  // Function to create and execute the child process
  createChildProcess() {
    return new Promise((resolve, reject) => {
      let child;
      let fileName;
      this.ensureTempDirectoryExists();

      // Start a timeout
      const timeoutId = setTimeout(() => {
        reject({
          status: 'error',
          output: '',
          message: `Code execution timed out after ${this.timeout}ms`
        });
        if (child && child.kill) {
          child.kill('SIGTERM');  // Kill the child process if it exceeds the timeout
        }
      }, this.timeout);

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
        let compilationError = "";
        child.stderr.on("data",(data)=>{
          compilationError+=data.toString();
        });
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
              clearTimeout(timeoutId);  // Clear the timeout
            unlinkSync(fileName);
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
            clearTimeout(timeoutId);  // Clear the timeout
            unlinkSync(fileName);
            reject({
              status: 'error',
              output: compilationError,
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
        let compilationError = "";
        child.stderr.on("data",(data)=>{
          compilationError+=data.toString();
        });
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
              clearTimeout(timeoutId);  // Clear the timeout
              unlinkSync(fileName);
              unlinkSync(fileName.substring(0,fileName.length-4));
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
            clearTimeout(timeoutId);  // Clear the timeout
            unlinkSync(fileName);
            reject({
              status: 'error',
              output: compilationError,
              message: 'Compilation error'
            });
          }
        });
        return;
      } else {
        clearTimeout(timeoutId);  // Clear the timeout
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
        clearTimeout(timeoutId);  // Clear the timeout
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
// let input = 'Hello from user input!';

// const javaExecutor = new ChildProcessExecutor(langJava, javaCode, input,crypto.randomUUID())
// const cppExecutor = new ChildProcessExecutor(langCpp, cppCode, input,crypto.randomUUID());

// javaExecutor.execute()
//   .then(result => console.log('Java Result:', result))
//   .catch(error => console.error('Java Error:', error));

// cppExecutor.execute()
//   .then(result => console.log('C++ Result:', result))
//   .catch(error => console.error('C++ Error:', error));

// // Example usage:
// const code = "console.log('Hello from JS!')";
// const lang = 'js'; // Can be 'js' for JavaScript, 'python' for Python, etc.
// input = '';

// const executor = new ChildProcessExecutor(lang, code, input,crypto.randomUUID());
// executor.execute()
//   .then(result => {
//     console.log('Result:', result);
//   })
//   .catch(error => {
//     console.error('Error:', error);
//   });

