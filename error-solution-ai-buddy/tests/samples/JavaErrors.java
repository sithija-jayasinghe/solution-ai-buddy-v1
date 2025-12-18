/**
 * Sample Java file with intentional errors
 * Compile/run to test Error Buddy
 * 
 * To test:
 * errbuddy javac JavaErrors.java
 * errbuddy java JavaErrors
 */
public class JavaErrors {

    public static void main(String[] args) {
        // Uncomment one to test:
        
        // testNullPointer();
        // testArrayBounds();
        // testClassCast();
        
        System.out.println("Java test file. Uncomment a method call to trigger an error.");
    }

    // Example 1: NullPointerException
    public static void testNullPointer() {
        String str = null;
        System.out.println(str.length()); // NullPointerException!
    }

    // Example 2: ArrayIndexOutOfBoundsException
    public static void testArrayBounds() {
        int[] arr = new int[5];
        System.out.println(arr[10]); // ArrayIndexOutOfBoundsException!
    }

    // Example 3: ClassCastException
    public static void testClassCast() {
        Object obj = "Hello";
        Integer num = (Integer) obj; // ClassCastException!
    }
}
