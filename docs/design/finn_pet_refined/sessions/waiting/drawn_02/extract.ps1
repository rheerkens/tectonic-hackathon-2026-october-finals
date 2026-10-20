$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
public class WaitingSpriteExtract {
  public static Rectangle Bounds(Bitmap image, Rectangle region) {
    int minX=region.Right,minY=region.Bottom,maxX=-1,maxY=-1;
    for(int y=region.Top;y<region.Bottom;y++) for(int x=region.Left;x<region.Right;x++) if(image.GetPixel(x,y).A>32){minX=Math.Min(minX,x);minY=Math.Min(minY,y);maxX=Math.Max(maxX,x);maxY=Math.Max(maxY,y);}
    return Rectangle.FromLTRB(minX,minY,maxX+1,maxY+1);
  }
  public static void Run(string sourcePath,string generatedPath,string folder){
    using(var source=new Bitmap(sourcePath)) using(var generated=new Bitmap(generatedPath)) {
      var target=Bounds(source,new Rectangle(0,0,source.Width,source.Height));
      Console.WriteLine("Source bounds: "+target);
      for(int i=0;i<3;i++){
        int left=(int)Math.Round(i*generated.Width/3.0),right=(int)Math.Round((i+1)*generated.Width/3.0);
        var bounds=Bounds(generated,new Rectangle(left,0,right-left,generated.Height));
        float scale=(float)target.Height/bounds.Height;
        float drawX=target.X+target.Width/2f-(bounds.X+bounds.Width/2f)*scale;
        float drawY=target.Bottom-bounds.Bottom*scale;
        using(var normalized=new Bitmap(192,208,PixelFormat.Format32bppArgb)) {
          using(var g=Graphics.FromImage(normalized)) {g.InterpolationMode=InterpolationMode.HighQualityBicubic;g.CompositingMode=CompositingMode.SourceCopy;g.DrawImage(generated,new RectangleF(drawX,drawY,generated.Width*scale,generated.Height*scale));}
          normalized.Save(System.IO.Path.Combine(folder,"generated_normalized_"+i+".png"),ImageFormat.Png);
          if(i<2) {
            using(var frame=new Bitmap(192,208,PixelFormat.Format32bppArgb)) {
              for(int y=0;y<208;y++)for(int x=0;x<192;x++)frame.SetPixel(x,y,source.GetPixel(x,y));
              // Keep the original body, head contour, glasses rims and alpha exactly.
              // Only import newly drawn eyelids inside the two original lenses.
              double[,] lenses={{88,54,10.2,9.7},{114,51,9.6,9.5}};
              int changed=0;
              for(int y=40;y<66;y++)for(int x=77;x<125;x++){
                double weight=0;
                for(int lens=0;lens<2;lens++){
                  double dx=(x-lenses[lens,0])/lenses[lens,2],dy=(y-lenses[lens,1])/lenses[lens,3];
                  double r=Math.Sqrt(dx*dx+dy*dy);
                  weight=Math.Max(weight,Math.Max(0,Math.Min(1,(1-r)*7)));
                }
                if(weight<=0)continue;
                var a=source.GetPixel(x,y);var b=normalized.GetPixel(x,y);
                var pixel=Color.FromArgb(a.A,(int)Math.Round(a.R+(b.R-a.R)*weight),(int)Math.Round(a.G+(b.G-a.G)*weight),(int)Math.Round(a.B+(b.B-a.B)*weight));
                frame.SetPixel(x,y,pixel);
                if(pixel.ToArgb()!=a.ToArgb())changed++;
              }
              string name=i==0?"blink_half.png":"blink_closed.png";
              frame.Save(System.IO.Path.Combine(folder,name),ImageFormat.Png);
              using(var large=new Bitmap(592,400))using(var g=Graphics.FromImage(large)){g.InterpolationMode=InterpolationMode.NearestNeighbor;g.DrawImage(frame,new Rectangle(0,0,592,400),new Rectangle(64,28,74,50),GraphicsUnit.Pixel);large.Save(System.IO.Path.Combine(folder,"composite_face_"+i+".png"),ImageFormat.Png);}
              Console.WriteLine("Composite "+name+": "+changed+" changed RGB pixels inside original lenses, original alpha retained.");
            }
          }
          using(var large=new Bitmap(592,400)) using(var g=Graphics.FromImage(large)){g.InterpolationMode=InterpolationMode.NearestNeighbor;g.DrawImage(normalized,new Rectangle(0,0,592,400),new Rectangle(64,28,74,50),GraphicsUnit.Pixel);large.Save(System.IO.Path.Combine(folder,"face_"+i+".png"),ImageFormat.Png);}
        }
        Console.WriteLine("Generated cell "+i+": "+bounds+", scale "+scale);
      }
    }
  }
}
'@
$root=(Get-Location).Path
[WaitingSpriteExtract]::Run((Join-Path $root 'docs/design/finn_pet/frames/waiting/00.png'),(Join-Path $PSScriptRoot 'generated_strip.png'),$PSScriptRoot)
