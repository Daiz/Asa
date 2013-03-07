var Rec601 = {
      Kr: 0.299,
      Kg: 0.587,
      Kb: 0.114
    },
    Rec709 = {
      Kr: 0.2126,
      Kg: 0.7152,
      Kb: 0.0722
    };
    
function RGBtoYUV(color, matrix) {
  var Kr = matrix.Kr,
      Kg = matrix.Kg,
      Kb = matrix.Kb,
      r = color.r,
      g = color.g,
      b = color.b,
      y, u, v;

  y = (Kr*219/255)*r + (Kg*219/255)*g + (Kb*219/255)*b;
  v = 112/255*r - Kg*112/255*g/(1-Kr) - Kb*112/255*b/(1-Kr);
  u = - Kr*112/255*r/(1-Kb) - Kg*112/255*g/(1-Kb) + 112/255*b;

  return {y: y+16, u: u+128, v: v+128};
}

function YUVtoRGB(color, matrix) {
  var Kr = matrix.Kr,
      Kg = matrix.Kg,
      Kb = matrix.Kb,
      y = color.y,
      u = color.u,
      v = color.v,
      r, g, b;

  r = (255/219)*y + (255/112)*v*(1-Kr) - (255*16/219 + 255*128/112*(1-Kr)); 
  g = (255/219)*y - (255/112)*u*(1-Kb)*Kb/Kg - (255/112)*v*(1-Kr)*Kr/Kg - (255*16/219 - 255/112*128*(1-Kb)*Kb/Kg - 255/112*128*(1-Kr)*Kr/Kg);
  b = (255/219)*y + (255/112)*u*(1-Kb) - (255*16/219 + 255*128/112*(1-Kb));

  return {r: r|0, g: g|0, b: b|0};
}

function cmConv(color,mat1,mat2) {
  return YUVtoRGB(RGBtoYUV(color,mat1),mat2);
}