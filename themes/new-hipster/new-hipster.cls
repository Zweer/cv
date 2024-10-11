\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{new-hipster}[2024/09/06 A New Simple CV Template]

\LoadClass[]{article}
\RequirePackage{xcolor}

\definecolor{cvgreen}{HTML}{3B9E80}
\definecolor{cvgray}{HTML}{646464}
\definecolor{cvblue}{HTML}{2EB6E1}
\definecolor{cvred}{HTML}{E1592E}

%%%%%%%%%%%%%%%%%%%%%%% Pastel Green %%%%%%%%%%%%%%%%%%%%%%%
\DeclareOption{pastel-green}{
  \colorlet{cvtext}{cvgray}
  \colorlet{cvheader}{cvgreen!30}
  \colorlet{cvheadertext}{cvtext}
  \colorlet{cvsidebar}{cvgreen!10}
  \colorlet{cvsidebartext}{cvtext}
  \colorlet{cvuniversity}{cvblue}
  \colorlet{cvlocation}{cvred}
}

%%%%%%%%%%%%%%%%%%%%%%%% Pastel Red %%%%%%%%%%%%%%%%%%%%%%%%
\DeclareOption{pastel-red}{
  \colorlet{cvtext}{cvgray}
  \definecolor{cvheader}{HTML}{75233E}
  \colorlet{cvheadertext}{white}
  \colorlet{cvsidebar}{cvheader!20}
  \colorlet{cvsidebartext}{cvtext}
  \colorlet{cvuniversity}{cvblue}
  \colorlet{cvlocation}{cvred}
}

%%%%%%%%%%%%%%%%%%%%%%% Light Metal %%%%%%%%%%%%%%%%%%%%%%%%
\DeclareOption{light-metal}{
  \colorlet{cvtext}{black}
  \definecolor{cvheader}{HTML}{404040}
  \colorlet{cvheadertext}{white}
  \definecolor{cvsidebar}{HTML}{E6E6E6}
  \colorlet{cvsidebartext}{cvtext}
  \colorlet{cvuniversity}{cvblue}
  \colorlet{cvlocation}{cvred}
}

%%%%%%%%%%%%%%%%%%%%%%%% Dark Metal %%%%%%%%%%%%%%%%%%%%%%%%
\DeclareOption{dark-metal}{
  \colorlet{cvtext}{black}
  \definecolor{cvheader}{HTML}{1A1A1A}
  \colorlet{cvheadertext}{white}
  \definecolor{cvsidebar}{HTML}{404040}
  \colorlet{cvsidebartext}{white}
  \colorlet{cvuniversity}{cvblue}
  \colorlet{cvlocation}{cvred}
}

%%%%%%%%%%%%%%%%%%%%%%%%% All Black %%%%%%%%%%%%%%%%%%%%%%%%
\DeclareOption{all-black}{
  \colorlet{cvtext}{black}
  \definecolor{cvheader}{HTML}{1A1A1A}
  \colorlet{cvheadertext}{white}
  \colorlet{cvsidebar}{white}
  \colorlet{cvsidebartext}{cvtext}
  \colorlet{cvuniversity}{cvblue}
  \colorlet{cvlocation}{cvred}
}

%%%%%%%%%%%%%%%%%%%%%%%%%%% Grey %%%%%%%%%%%%%%%%%%%%%%%%%%%
\DeclareOption{grey}{
  \colorlet{cvtext}{black}
  \definecolor{cvheader}{HTML}{808080}
  \colorlet{cvheadertext}{white}
  \colorlet{cvsidebar}{white}
  \colorlet{cvsidebartext}{cvtext}
  \colorlet{cvuniversity}{cvblue}
  \colorlet{cvlocation}{cvred}
}

\DeclareOption*{\PassOptionsToClass{\CurrentOption}{article}}
\ProcessOptions\relax

\usepackage{new-hipster}
