$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
public class WaitingGestureExtract {
  public static Rectangle Bounds(Bitmap image,Rectangle region){
    int x0=region.Right,y0=region.Bottom,x1=-1,y1=-1;
    for(int y=region.Top;y<region.Bottom;y++)for(int x=region.Left;x<region.Right;x++)if(image.GetPixel(x,y).A>32){x0=Math.Min(x0,x);y0=Math.Min(y0,y);x1=Math.Max(x1,x);y1=Math.Max(y1,y);}
    return Rectangle.FromLTRB(x0,y0,x1+1,y1+1);
  }
  public static void Run(string sourcePath,string generatedPath,string folder){
    using(var source=new Bitmap(sourcePath))using(var generated=new Bitmap(generatedPath))using(var contact=new Bitmap(768,208,PixelFormat.Format32bppArgb))using(var finalContact=new Bitmap(768,208,PixelFormat.Format32bppArgb)) {
      var target=Bounds(source,new Rectangle(0,0,192,208));var targetFeet=Bounds(source,new Rectangle(0,160,192,48));
      using(var cg=Graphics.FromImage(contact)){cg.CompositingMode=CompositingMode.SourceCopy;cg.DrawImageUnscaled(source,0,0);}
      using(var cg=Graphics.FromImage(finalContact)){cg.CompositingMode=CompositingMode.SourceCopy;cg.DrawImageUnscaled(source,0,0);}
      for(int i=0;i<3;i++){
        int left=(int)Math.Round(i*generated.Width/3.0),right=(int)Math.Round((i+1)*generated.Width/3.0);
        var bounds=Bounds(generated,new Rectangle(left,0,right-left,generated.Height));
        var feet=Bounds(generated,new Rectangle(left,(int)(generated.Height*0.76),right-left,generated.Height-(int)(generated.Height*0.76)));
        float scale=(float)target.Height/bounds.Height;
        float drawX=targetFeet.X+targetFeet.Width/2f-(feet.X+feet.Width/2f)*scale;
        float drawY=target.Bottom-bounds.Bottom*scale;
        using(var normalized=new Bitmap(192,208,PixelFormat.Format32bppArgb)){
          using(var g=Graphics.FromImage(normalized)){g.CompositingMode=CompositingMode.SourceCopy;g.InterpolationMode=InterpolationMode.HighQualityBicubic;g.DrawImage(generated,new RectangleF(drawX,drawY,generated.Width*scale,generated.Height*scale));}
          normalized.Save(System.IO.Path.Combine(folder,"normalized_"+i+".png"),ImageFormat.Png);
          using(var cg=Graphics.FromImage(contact)){cg.CompositingMode=CompositingMode.SourceCopy;cg.DrawImageUnscaled(normalized,(i+1)*192,0);}
          using(var frame=new Bitmap(192,208,PixelFormat.Format32bppArgb)){
            for(int y=0;y<208;y++)for(int x=0;x<192;x++)frame.SetPixel(x,y,source.GetPixel(x,y));
            for(int y=78;y<135;y++)for(int x=118;x<181;x++){
              var a=source.GetPixel(x,y);var b=normalized.GetPixel(x,y);
              double w=Math.Max(0,Math.Min(1,(x-118)/4.0));
              frame.SetPixel(x,y,Color.FromArgb((int)Math.Round(a.A+(b.A-a.A)*w),(int)Math.Round(a.R+(b.R-a.R)*w),(int)Math.Round(a.G+(b.G-a.G)*w),(int)Math.Round(a.B+(b.B-a.B)*w)));
            }
            frame.Save(System.IO.Path.Combine(folder,"arm_"+i+".png"),ImageFormat.Png);
            using(var patch=frame.Clone(new Rectangle(118,78,63,57),PixelFormat.Format32bppArgb)){patch.Save(System.IO.Path.Combine(folder,"arm_patch_"+i+".png"),ImageFormat.Png);}
            using(var cg=Graphics.FromImage(finalContact)){cg.CompositingMode=CompositingMode.SourceCopy;cg.DrawImageUnscaled(frame,(i+1)*192,0);}
            using(var crop=new Bitmap(504,456))using(var g=Graphics.FromImage(crop)){g.InterpolationMode=InterpolationMode.NearestNeighbor;g.DrawImage(frame,new Rectangle(0,0,504,456),new Rectangle(118,78,63,57),GraphicsUnit.Pixel);crop.Save(System.IO.Path.Combine(folder,"arm_inspection_"+i+".png"),ImageFormat.Png);}
          }
        }
        Console.WriteLine("Cell "+i+" bounds "+bounds+"; feet "+feet+"; scale "+scale+"; offset "+drawX+","+drawY);
      }
      contact.Save(System.IO.Path.Combine(folder,"normalization_contact.png"),ImageFormat.Png);
      finalContact.Save(System.IO.Path.Combine(folder,"candidate_contact.png"),ImageFormat.Png);
    }
  }
}
'@
$root=(Get-Location).Path
[WaitingGestureExtract]::Run((Join-Path $root 'docs/design/finn_pet/frames/waiting/00.png'),(Join-Path $PSScriptRoot 'generated_strip.png'),$PSScriptRoot)
