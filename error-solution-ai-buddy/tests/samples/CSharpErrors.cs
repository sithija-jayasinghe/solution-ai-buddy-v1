/**
 * Sample C# file with intentional errors
 * Build/run to test Error Buddy
 * 
 * To test:
 * errbuddy dotnet run
 */
using System;

class CSharpErrors
{
    static void Main(string[] args)
    {
        // Uncomment one to test:
        
        // TestNullReference();
        // TestIndexOutOfRange();
        // TestInvalidCast();
        
        Console.WriteLine("C# test file. Uncomment a method call to trigger an error.");
    }

    // Example 1: NullReferenceException
    static void TestNullReference()
    {
        string str = null;
        Console.WriteLine(str.Length); // NullReferenceException!
    }

    // Example 2: IndexOutOfRangeException
    static void TestIndexOutOfRange()
    {
        int[] arr = new int[5];
        Console.WriteLine(arr[10]); // IndexOutOfRangeException!
    }

    // Example 3: InvalidCastException
    static void TestInvalidCast()
    {
        object obj = "Hello";
        int num = (int)obj; // InvalidCastException!
    }
}
